import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import * as fs   from 'fs/promises';
import * as path from 'path';
import { ConfigService }   from '@nestjs/config';
import { DatabaseService } from '../common/database/database.service';
import { ParserService }   from './parser.service';
import { ChunkerService }  from './chunker.service';
import { EmbeddingService } from './embedding.service';
import { CourseMaterial, MaterialType, UploadMaterialDto } from './ingest.types';

@Injectable()
export class IngestService {
  private readonly logger    = new Logger(IngestService.name);
  private readonly uploadDir: string;

  constructor(
    private db:         DatabaseService,
    private parser:     ParserService,
    private chunker:    ChunkerService,
    private embeddings: EmbeddingService,
    private config:     ConfigService,
  ) {
    this.uploadDir = this.config.get<string>('UPLOAD_DIR', './uploads');
  }

  async uploadMaterial(file: Express.Multer.File, dto: UploadMaterialDto): Promise<CourseMaterial> {
    const { data: course } = await this.db.client
      .from('courses').select('id').eq('id', dto.courseId).single();
    if (!course) throw new NotFoundException(`Course ${dto.courseId} not found`);

    const destDir     = path.join(this.uploadDir, dto.courseId);
    await fs.mkdir(destDir, { recursive: true });
    const filename    = `${Date.now()}_${file.originalname}`;
    const storagePath = path.join(destDir, filename);
    await fs.writeFile(storagePath, file.buffer);

    const { data: material, error } = await this.db.client
      .from('course_materials')
      .insert({
        course_id:    dto.courseId,
        filename:     file.originalname,
        file_type:    dto.fileType as MaterialType,
        mime_type:    file.mimetype,
        file_size:    file.size,
        storage_path: storagePath,
        status:       'pending',
      })
      .select().single();

    if (error) throw new Error(error.message);

    this.logger.log(`Material ${material.id} uploaded for course ${dto.courseId}`);
    this.processMaterial(material.id).catch(err =>
      this.logger.error(`Background processing failed for ${material.id}:`, err),
    );

    return material;
  }

  async processMaterial(materialId: string): Promise<void> {
    const { data: material } = await this.db.client
      .from('course_materials').select('*').eq('id', materialId).single();
    if (!material) throw new NotFoundException(`Material ${materialId} not found`);

    this.logger.log(`Processing material ${materialId} [${material.filename}]`);

    await this.db.client.from('course_materials')
      .update({ status: 'processing' }).eq('id', materialId);

    try {
      const doc       = await this.parser.parse(material.storage_path, material.mime_type);
      const rawChunks = this.chunker.chunkPages(doc.pages, material.filename);
      const contents  = rawChunks.map(c => c.content);
      const embeddings = await this.embeddings.embedBatch(contents);

      // Delete existing chunks (idempotent)
      await this.db.client.from('course_chunks').delete().eq('material_id', materialId);

      // Insert chunks in batches of 50
      const rows = rawChunks.map((chunk, i) => ({
        course_id:   material.course_id,
        material_id: materialId,
        content:     chunk.content,
        embedding:   DatabaseService.serializeEmbedding(embeddings[i]),
        chunk_index: chunk.chunkIndex,
        metadata:    chunk.metadata,
      }));

      for (let i = 0; i < rows.length; i += 50) {
        const { error } = await this.db.client
          .from('course_chunks').insert(rows.slice(i, i + 50));
        if (error) throw new Error(error.message);
      }

      await this.db.client.from('course_materials').update({
        status:       'completed',
        chunk_count:  rawChunks.length,
        processed_at: new Date().toISOString(),
      }).eq('id', materialId);

      this.logger.log(`Material ${materialId} processed: ${rawChunks.length} chunks`);
    } catch (err: any) {
      await this.db.client.from('course_materials').update({
        status:        'failed',
        error_message: err.message ?? 'Unknown error',
      }).eq('id', materialId);
      throw err;
    }
  }

  async getMaterialStatus(materialId: string): Promise<CourseMaterial> {
    const { data, error } = await this.db.client
      .from('course_materials').select('*').eq('id', materialId).single();
    if (error || !data) throw new NotFoundException(`Material ${materialId} not found`);
    return data;
  }

  async getMaterialsByCourse(courseId: string): Promise<CourseMaterial[]> {
    const { data } = await this.db.client
      .from('course_materials').select('*').eq('course_id', courseId)
      .order('uploaded_at', { ascending: false });
    return data ?? [];
  }

  async deleteMaterial(materialId: string): Promise<void> {
    const { data: material } = await this.db.client
      .from('course_materials').select('*').eq('id', materialId).single();
    if (!material) throw new NotFoundException(`Material ${materialId} not found`);
    try { await fs.unlink(material.storage_path); } catch {}
    await this.db.client.from('course_materials').delete().eq('id', materialId);
  }

  async reprocessMaterial(materialId: string): Promise<void> {
    const { data } = await this.db.client
      .from('course_materials').select('*').eq('id', materialId).eq('status', 'failed').single();
    if (!data) throw new BadRequestException(`Material ${materialId} not found or not failed`);
    await this.processMaterial(materialId);
  }
}

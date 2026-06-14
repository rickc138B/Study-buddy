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

@Injectable()
export class DomainIngestService {
  private readonly logger    = new Logger(DomainIngestService.name);
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

  async uploadMaterial(file: Express.Multer.File, domainId: string, fileType: string) {
    const { data: domain } = await this.db.client
      .from('knowledge_domains').select('id').eq('id', domainId).single();
    if (!domain) throw new NotFoundException(`Domain ${domainId} not found`);

    const destDir     = path.join(this.uploadDir, 'domains', domainId);
    await fs.mkdir(destDir, { recursive: true });
    const filename    = `${Date.now()}_${file.originalname}`;
    const storagePath = path.join(destDir, filename);
    await fs.writeFile(storagePath, file.buffer);

    const { data: material, error } = await this.db.client
      .from('domain_materials')
      .insert({
        domain_id:    domainId,
        filename:     file.originalname,
        file_type:    fileType,
        mime_type:    file.mimetype,
        file_size:    file.size,
        storage_path: storagePath,
        status:       'pending',
      })
      .select().single();

    if (error) throw new Error(error.message);

    this.logger.log(`Material ${material.id} uploaded for domain ${domainId}`);
    this.processMaterial(material.id).catch(err =>
      this.logger.error(`Background processing failed for ${material.id}:`, err),
    );

    return material;
  }

  async processMaterial(materialId: string): Promise<void> {
    const { data: material } = await this.db.client
      .from('domain_materials').select('*').eq('id', materialId).single();
    if (!material) throw new NotFoundException(`Material ${materialId} not found`);

    this.logger.log(`Processing domain material ${materialId} [${material.filename}]`);

    await this.db.client.from('domain_materials')
      .update({ status: 'processing' }).eq('id', materialId);

    try {
      const doc        = await this.parser.parse(material.storage_path, material.mime_type);
      const rawChunks  = this.chunker.chunkPages(doc.pages, material.filename);
      const contents   = rawChunks.map(c => c.content);
      const embeddings = await this.embeddings.embedBatch(contents);

      await this.db.client.from('domain_chunks').delete().eq('material_id', materialId);

      const rows = rawChunks.map((chunk, i) => ({
        domain_id:   material.domain_id,
        material_id: materialId,
        content:     chunk.content,
        embedding:   DatabaseService.serializeEmbedding(embeddings[i]),
        chunk_index: chunk.chunkIndex,
        metadata:    chunk.metadata,
      }));

      for (let i = 0; i < rows.length; i += 50) {
        const { error } = await this.db.client
          .from('domain_chunks').insert(rows.slice(i, i + 50));
        if (error) throw new Error(error.message);
      }

      await this.db.client.from('domain_materials').update({
        status:       'completed',
        chunk_count:  rawChunks.length,
        processed_at: new Date().toISOString(),
      }).eq('id', materialId);

      this.logger.log(`Domain material ${materialId} processed: ${rawChunks.length} chunks`);
    } catch (err: any) {
      await this.db.client.from('domain_materials').update({
        status:        'failed',
        error_message: err.message ?? 'Unknown error',
      }).eq('id', materialId);
      throw err;
    }
  }

  async getMaterialStatus(materialId: string) {
    const { data, error } = await this.db.client
      .from('domain_materials').select('*').eq('id', materialId).single();
    if (error || !data) throw new NotFoundException(`Material ${materialId} not found`);
    return data;
  }

  async getMaterialsByDomain(domainId: string) {
    const { data } = await this.db.client
      .from('domain_materials').select('*').eq('domain_id', domainId)
      .order('uploaded_at', { ascending: false });
    return data ?? [];
  }

  async deleteMaterial(materialId: string): Promise<void> {
    const { data: material } = await this.db.client
      .from('domain_materials').select('*').eq('id', materialId).single();
    if (!material) throw new NotFoundException(`Material ${materialId} not found`);
    try { await fs.unlink(material.storage_path); } catch {}
    await this.db.client.from('domain_materials').delete().eq('id', materialId);
  }

  async reprocessMaterial(materialId: string): Promise<void> {
    const { data } = await this.db.client
      .from('domain_materials').select('*').eq('id', materialId).eq('status', 'failed').single();
    if (!data) throw new BadRequestException(`Material ${materialId} not found or not failed`);
    await this.processMaterial(materialId);
  }
}

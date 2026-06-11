// src/ingest/ingest.controller.ts
import {
  Controller, Post, Get, Delete, Param, Body,
  UploadedFile, UseInterceptors, HttpCode, HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage }   from 'multer';
import { IngestService }   from './ingest.service';
import { UploadMaterialDto, MaterialType } from './ingest.types';

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]);

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

@Controller('admin/ingest')
export class IngestController {
  constructor(private ingest: IngestService) {}

  /**
   * POST /admin/ingest/upload
   * Multipart: file + courseId + fileType
   */
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(), // buffer in memory, we write to disk in service
      limits:  { fileSize: MAX_FILE_SIZE },
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body('courseId') courseId: string,
    @Body('fileType') fileType: string,
  ) {
    if (!file)     throw new BadRequestException('No file provided');
    if (!courseId) throw new BadRequestException('courseId is required');

    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException(
        `Unsupported file type: ${file.mimetype}. Allowed: PDF, DOCX, TXT`,
      );
    }

    const dto: UploadMaterialDto = {
      courseId,
      fileType: (fileType as MaterialType) ?? 'other',
    };

    const material = await this.ingest.uploadMaterial(file, dto);

    return {
      materialId:  material.id,
      filename:    material.filename,
      status:      material.status,
      message:     'Upload successful. Processing started in background.',
    };
  }

  /**
   * GET /admin/ingest/status/:materialId
   * Poll this to check processing progress.
   */
  @Get('status/:materialId')
  async getStatus(@Param('materialId') materialId: string) {
    const material = await this.ingest.getMaterialStatus(materialId);
    return {
      materialId:  material.id,
      filename:    material.filename,
      status:      material.status,
      chunkCount:  material.chunk_count,
      uploadedAt:  material.uploaded_at,
      processedAt: material.processed_at,
      error:       material.error_message,
    };
  }

  /**
   * GET /admin/ingest/course/:courseId
   * List all materials for a course.
   */
  @Get('course/:courseId')
  async getByCourse(@Param('courseId') courseId: string) {
    return this.ingest.getMaterialsByCourse(courseId);
  }

  /**
   * POST /admin/ingest/reprocess/:materialId
   * Retry a failed material.
   */
  @Post('reprocess/:materialId')
  @HttpCode(HttpStatus.ACCEPTED)
  async reprocess(@Param('materialId') materialId: string) {
    await this.ingest.reprocessMaterial(materialId);
    return { message: 'Reprocessing started' };
  }

  /**
   * DELETE /admin/ingest/:materialId
   * Remove material + all its chunks.
   */
  @Delete(':materialId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('materialId') materialId: string) {
    await this.ingest.deleteMaterial(materialId);
  }
}

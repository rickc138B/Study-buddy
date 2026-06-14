import {
  Controller, Post, Get, Delete, Param, Body,
  UseInterceptors, UploadedFile, HttpCode, HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage }   from 'multer';
import { DomainIngestService } from './domain-ingest.service';

@Controller('admin/domains')
export class DomainIngestController {
  constructor(private domainIngest: DomainIngestService) {}

  @Post(':domainId/upload')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async upload(
    @Param('domainId') domainId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('fileType') fileType: string,
  ) {
    const material = await this.domainIngest.uploadMaterial(file, domainId, fileType ?? 'other');
    return { materialId: material.id, filename: material.filename };
  }

  @Get(':domainId/materials')
  async list(@Param('domainId') domainId: string) {
    return this.domainIngest.getMaterialsByDomain(domainId);
  }

  @Get('materials/status/:materialId')
  async status(@Param('materialId') materialId: string) {
    const m = await this.domainIngest.getMaterialStatus(materialId);
    return { materialId: m.id, status: m.status, chunkCount: m.chunk_count, error: m.error_message };
  }

  @Post('materials/reprocess/:materialId')
  @HttpCode(HttpStatus.OK)
  async reprocess(@Param('materialId') materialId: string) {
    await this.domainIngest.reprocessMaterial(materialId);
    return { ok: true };
  }

  @Delete('materials/:materialId')
  @HttpCode(HttpStatus.OK)
  async delete(@Param('materialId') materialId: string) {
    await this.domainIngest.deleteMaterial(materialId);
    return { ok: true };
  }
}

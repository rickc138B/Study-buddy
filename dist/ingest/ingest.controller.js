"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IngestController = void 0;
// src/ingest/ingest.controller.ts
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const ingest_service_1 = require("./ingest.service");
const ALLOWED_MIME_TYPES = new Set([
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
]);
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
let IngestController = class IngestController {
    constructor(ingest) {
        this.ingest = ingest;
    }
    /**
     * POST /admin/ingest/upload
     * Multipart: file + courseId + fileType
     */
    async upload(file, courseId, fileType) {
        if (!file)
            throw new common_1.BadRequestException('No file provided');
        if (!courseId)
            throw new common_1.BadRequestException('courseId is required');
        if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
            throw new common_1.BadRequestException(`Unsupported file type: ${file.mimetype}. Allowed: PDF, DOCX, TXT`);
        }
        const dto = {
            courseId,
            fileType: fileType ?? 'other',
        };
        const material = await this.ingest.uploadMaterial(file, dto);
        return {
            materialId: material.id,
            filename: material.filename,
            status: material.status,
            message: 'Upload successful. Processing started in background.',
        };
    }
    /**
     * GET /admin/ingest/status/:materialId
     * Poll this to check processing progress.
     */
    async getStatus(materialId) {
        const material = await this.ingest.getMaterialStatus(materialId);
        return {
            materialId: material.id,
            filename: material.filename,
            status: material.status,
            chunkCount: material.chunk_count,
            uploadedAt: material.uploaded_at,
            processedAt: material.processed_at,
            error: material.error_message,
        };
    }
    /**
     * GET /admin/ingest/course/:courseId
     * List all materials for a course.
     */
    async getByCourse(courseId) {
        return this.ingest.getMaterialsByCourse(courseId);
    }
    /**
     * POST /admin/ingest/reprocess/:materialId
     * Retry a failed material.
     */
    async reprocess(materialId) {
        await this.ingest.reprocessMaterial(materialId);
        return { message: 'Reprocessing started' };
    }
    /**
     * DELETE /admin/ingest/:materialId
     * Remove material + all its chunks.
     */
    async delete(materialId) {
        await this.ingest.deleteMaterial(materialId);
    }
};
exports.IngestController = IngestController;
__decorate([
    (0, common_1.Post)('upload'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        storage: (0, multer_1.memoryStorage)(), // buffer in memory, we write to disk in service
        limits: { fileSize: MAX_FILE_SIZE },
    })),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Body)('courseId')),
    __param(2, (0, common_1.Body)('fileType')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], IngestController.prototype, "upload", null);
__decorate([
    (0, common_1.Get)('status/:materialId'),
    __param(0, (0, common_1.Param)('materialId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], IngestController.prototype, "getStatus", null);
__decorate([
    (0, common_1.Get)('course/:courseId'),
    __param(0, (0, common_1.Param)('courseId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], IngestController.prototype, "getByCourse", null);
__decorate([
    (0, common_1.Post)('reprocess/:materialId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.ACCEPTED),
    __param(0, (0, common_1.Param)('materialId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], IngestController.prototype, "reprocess", null);
__decorate([
    (0, common_1.Delete)(':materialId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('materialId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], IngestController.prototype, "delete", null);
exports.IngestController = IngestController = __decorate([
    (0, common_1.Controller)('admin/ingest'),
    __metadata("design:paramtypes", [ingest_service_1.IngestService])
], IngestController);
//# sourceMappingURL=ingest.controller.js.map
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
exports.DomainIngestController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const domain_ingest_service_1 = require("./domain-ingest.service");
let DomainIngestController = class DomainIngestController {
    constructor(domainIngest) {
        this.domainIngest = domainIngest;
    }
    async upload(domainId, file, fileType) {
        const material = await this.domainIngest.uploadMaterial(file, domainId, fileType ?? 'other');
        return { materialId: material.id, filename: material.filename };
    }
    async list(domainId) {
        return this.domainIngest.getMaterialsByDomain(domainId);
    }
    async status(materialId) {
        const m = await this.domainIngest.getMaterialStatus(materialId);
        return { materialId: m.id, status: m.status, chunkCount: m.chunk_count, error: m.error_message };
    }
    async reprocess(materialId) {
        await this.domainIngest.reprocessMaterial(materialId);
        return { ok: true };
    }
    async delete(materialId) {
        await this.domainIngest.deleteMaterial(materialId);
        return { ok: true };
    }
};
exports.DomainIngestController = DomainIngestController;
__decorate([
    (0, common_1.Post)(':domainId/upload'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', { storage: (0, multer_1.memoryStorage)() })),
    __param(0, (0, common_1.Param)('domainId')),
    __param(1, (0, common_1.UploadedFile)()),
    __param(2, (0, common_1.Body)('fileType')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", Promise)
], DomainIngestController.prototype, "upload", null);
__decorate([
    (0, common_1.Get)(':domainId/materials'),
    __param(0, (0, common_1.Param)('domainId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DomainIngestController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('materials/status/:materialId'),
    __param(0, (0, common_1.Param)('materialId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DomainIngestController.prototype, "status", null);
__decorate([
    (0, common_1.Post)('materials/reprocess/:materialId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('materialId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DomainIngestController.prototype, "reprocess", null);
__decorate([
    (0, common_1.Delete)('materials/:materialId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('materialId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DomainIngestController.prototype, "delete", null);
exports.DomainIngestController = DomainIngestController = __decorate([
    (0, common_1.Controller)('admin/domains'),
    __metadata("design:paramtypes", [domain_ingest_service_1.DomainIngestService])
], DomainIngestController);
//# sourceMappingURL=domain-ingest.controller.js.map
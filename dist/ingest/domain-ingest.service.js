"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var DomainIngestService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DomainIngestService = void 0;
const common_1 = require("@nestjs/common");
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const config_1 = require("@nestjs/config");
const database_service_1 = require("../common/database/database.service");
const parser_service_1 = require("./parser.service");
const chunker_service_1 = require("./chunker.service");
const embedding_service_1 = require("./embedding.service");
let DomainIngestService = DomainIngestService_1 = class DomainIngestService {
    constructor(db, parser, chunker, embeddings, config) {
        this.db = db;
        this.parser = parser;
        this.chunker = chunker;
        this.embeddings = embeddings;
        this.config = config;
        this.logger = new common_1.Logger(DomainIngestService_1.name);
        this.uploadDir = this.config.get('UPLOAD_DIR', './uploads');
    }
    async uploadMaterial(file, domainId, fileType) {
        const { data: domain } = await this.db.client
            .from('knowledge_domains').select('id').eq('id', domainId).single();
        if (!domain)
            throw new common_1.NotFoundException(`Domain ${domainId} not found`);
        const destDir = path.join(this.uploadDir, 'domains', domainId);
        await fs.mkdir(destDir, { recursive: true });
        const filename = `${Date.now()}_${file.originalname}`;
        const storagePath = path.join(destDir, filename);
        await fs.writeFile(storagePath, file.buffer);
        const { data: material, error } = await this.db.client
            .from('domain_materials')
            .insert({
            domain_id: domainId,
            filename: file.originalname,
            file_type: fileType,
            mime_type: file.mimetype,
            file_size: file.size,
            storage_path: storagePath,
            status: 'pending',
        })
            .select().single();
        if (error)
            throw new Error(error.message);
        this.logger.log(`Material ${material.id} uploaded for domain ${domainId}`);
        this.processMaterial(material.id).catch(err => this.logger.error(`Background processing failed for ${material.id}:`, err));
        return material;
    }
    async processMaterial(materialId) {
        const { data: material } = await this.db.client
            .from('domain_materials').select('*').eq('id', materialId).single();
        if (!material)
            throw new common_1.NotFoundException(`Material ${materialId} not found`);
        this.logger.log(`Processing domain material ${materialId} [${material.filename}]`);
        await this.db.client.from('domain_materials')
            .update({ status: 'processing' }).eq('id', materialId);
        try {
            const doc = await this.parser.parse(material.storage_path, material.mime_type);
            const rawChunks = this.chunker.chunkPages(doc.pages, material.filename);
            const contents = rawChunks.map(c => c.content);
            const embeddings = await this.embeddings.embedBatch(contents);
            await this.db.client.from('domain_chunks').delete().eq('material_id', materialId);
            const rows = rawChunks.map((chunk, i) => ({
                domain_id: material.domain_id,
                material_id: materialId,
                content: chunk.content,
                embedding: database_service_1.DatabaseService.serializeEmbedding(embeddings[i]),
                chunk_index: chunk.chunkIndex,
                metadata: chunk.metadata,
            }));
            for (let i = 0; i < rows.length; i += 50) {
                const { error } = await this.db.client
                    .from('domain_chunks').insert(rows.slice(i, i + 50));
                if (error)
                    throw new Error(error.message);
            }
            await this.db.client.from('domain_materials').update({
                status: 'completed',
                chunk_count: rawChunks.length,
                processed_at: new Date().toISOString(),
            }).eq('id', materialId);
            this.logger.log(`Domain material ${materialId} processed: ${rawChunks.length} chunks`);
        }
        catch (err) {
            await this.db.client.from('domain_materials').update({
                status: 'failed',
                error_message: err.message ?? 'Unknown error',
            }).eq('id', materialId);
            throw err;
        }
    }
    async getMaterialStatus(materialId) {
        const { data, error } = await this.db.client
            .from('domain_materials').select('*').eq('id', materialId).single();
        if (error || !data)
            throw new common_1.NotFoundException(`Material ${materialId} not found`);
        return data;
    }
    async getMaterialsByDomain(domainId) {
        const { data } = await this.db.client
            .from('domain_materials').select('*').eq('domain_id', domainId)
            .order('uploaded_at', { ascending: false });
        return data ?? [];
    }
    async deleteMaterial(materialId) {
        const { data: material } = await this.db.client
            .from('domain_materials').select('*').eq('id', materialId).single();
        if (!material)
            throw new common_1.NotFoundException(`Material ${materialId} not found`);
        try {
            await fs.unlink(material.storage_path);
        }
        catch { }
        await this.db.client.from('domain_materials').delete().eq('id', materialId);
    }
    async reprocessMaterial(materialId) {
        const { data } = await this.db.client
            .from('domain_materials').select('*').eq('id', materialId).eq('status', 'failed').single();
        if (!data)
            throw new common_1.BadRequestException(`Material ${materialId} not found or not failed`);
        await this.processMaterial(materialId);
    }
};
exports.DomainIngestService = DomainIngestService;
exports.DomainIngestService = DomainIngestService = DomainIngestService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService,
        parser_service_1.ParserService,
        chunker_service_1.ChunkerService,
        embedding_service_1.EmbeddingService,
        config_1.ConfigService])
], DomainIngestService);
//# sourceMappingURL=domain-ingest.service.js.map
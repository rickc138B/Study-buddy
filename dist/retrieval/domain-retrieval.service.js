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
var DomainRetrievalService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DomainRetrievalService = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../common/database/database.service");
const embedding_service_1 = require("../ingest/embedding.service");
let DomainRetrievalService = DomainRetrievalService_1 = class DomainRetrievalService {
    constructor(db, embeddings) {
        this.db = db;
        this.embeddings = embeddings;
        this.logger = new common_1.Logger(DomainRetrievalService_1.name);
    }
    async retrieve(domainId, query, opts = {}) {
        const matchCount = opts.matchCount ?? 10;
        const threshold = opts.threshold ?? 0.10;
        const queryEmbedding = await this.embeddings.embedOne(query);
        const embeddingLiteral = database_service_1.DatabaseService.serializeEmbedding(queryEmbedding);
        const { data, error } = await this.db.client.rpc('match_domain_chunks', {
            p_domain_id: domainId,
            p_embedding: embeddingLiteral,
            p_match_count: matchCount,
            p_threshold: threshold,
        });
        if (error)
            throw new Error(error.message);
        this.logger.debug(`Domain retrieval: ${data?.length ?? 0} chunks for domain ${domainId}`);
        return (data ?? []).map((c) => ({ ...c, similarity: c.similarity ?? 1 }));
    }
    formatContext(chunks) {
        if (chunks.length === 0)
            return 'No relevant source material found for this query.';
        return chunks.map(chunk => {
            const source = chunk.metadata?.source_file ?? 'unknown';
            const page = chunk.metadata?.page ? `, page ${chunk.metadata.page}` : '';
            return `[Source: ${source}${page}]\n${chunk.content}`;
        }).join('\n---\n');
    }
    async retrieveAndFormat(domainId, query, opts) {
        const chunks = await this.retrieve(domainId, query, opts);
        const context = this.formatContext(chunks);
        return { context, chunks };
    }
};
exports.DomainRetrievalService = DomainRetrievalService;
exports.DomainRetrievalService = DomainRetrievalService = DomainRetrievalService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService,
        embedding_service_1.EmbeddingService])
], DomainRetrievalService);
//# sourceMappingURL=domain-retrieval.service.js.map
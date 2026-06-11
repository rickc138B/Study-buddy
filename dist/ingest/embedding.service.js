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
var EmbeddingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmbeddingService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let EmbeddingService = EmbeddingService_1 = class EmbeddingService {
    constructor(config) {
        this.config = config;
        this.logger = new common_1.Logger(EmbeddingService_1.name);
        this.model = 'openai/text-embedding-3-small';
        this.batchSize = 100;
        this.apiKey = this.config.getOrThrow('OPENROUTER_API_KEY');
    }
    async embedOne(text) {
        const [embedding] = await this.embedBatch([text]);
        return embedding;
    }
    async embedBatch(texts) {
        const results = [];
        for (let i = 0; i < texts.length; i += this.batchSize) {
            const batch = texts.slice(i, i + this.batchSize);
            this.logger.debug(`Embedding batch ${i / this.batchSize + 1} (${batch.length} items)`);
            const response = await fetch('https://openrouter.ai/api/v1/embeddings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify({ model: this.model, input: batch }),
            });
            if (!response.ok) {
                const err = await response.text();
                throw new Error(`OpenRouter embeddings error: ${response.status} ${err}`);
            }
            const data = await response.json();
            const sorted = data.data.sort((a, b) => a.index - b.index);
            results.push(...sorted.map(d => d.embedding));
        }
        return results;
    }
};
exports.EmbeddingService = EmbeddingService;
exports.EmbeddingService = EmbeddingService = EmbeddingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], EmbeddingService);
//# sourceMappingURL=embedding.service.js.map
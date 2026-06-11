"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChunkerService = void 0;
// src/ingest/chunker.service.ts
const common_1 = require("@nestjs/common");
const ingest_types_1 = require("./ingest.types");
let ChunkerService = class ChunkerService {
    /**
     * Split parsed pages into overlapping text chunks.
     * Strategy: sentence-aware splitting so chunks don't cut mid-sentence.
     */
    chunkPages(pages, sourceFile, opts = ingest_types_1.DEFAULT_CHUNK_OPTIONS) {
        // Approximate tokens → characters (4 chars ≈ 1 token)
        const maxChars = opts.maxTokens * 4;
        const overlapChars = opts.overlapTokens * 4;
        const chunks = [];
        let chunkIndex = 0;
        for (const page of pages) {
            const sentences = this.splitIntoSentences(page.text);
            let buffer = '';
            for (const sentence of sentences) {
                const candidate = buffer ? `${buffer} ${sentence}` : sentence;
                if (candidate.length <= maxChars) {
                    buffer = candidate;
                }
                else {
                    // Flush current buffer as a chunk
                    if (buffer.trim()) {
                        chunks.push({
                            content: buffer.trim(),
                            chunkIndex: chunkIndex++,
                            metadata: { page: page.pageNumber, source_file: sourceFile },
                        });
                    }
                    // Start new buffer with overlap from end of previous buffer
                    const overlap = buffer.slice(-overlapChars);
                    buffer = overlap ? `${overlap} ${sentence}` : sentence;
                }
            }
            // Flush remaining buffer at end of page
            if (buffer.trim()) {
                chunks.push({
                    content: buffer.trim(),
                    chunkIndex: chunkIndex++,
                    metadata: { page: page.pageNumber, source_file: sourceFile },
                });
                buffer = '';
            }
        }
        return chunks;
    }
    /** Naive but effective sentence splitter */
    splitIntoSentences(text) {
        return text
            .split(/(?<=[.!?])\s+/)
            .map(s => s.trim())
            .filter(s => s.length > 0);
    }
};
exports.ChunkerService = ChunkerService;
exports.ChunkerService = ChunkerService = __decorate([
    (0, common_1.Injectable)()
], ChunkerService);
//# sourceMappingURL=chunker.service.js.map
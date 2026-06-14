import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService }    from '../common/database/database.service';
import { EmbeddingService }   from '../ingest/embedding.service';
import { RetrievedChunk, RetrievalOptions } from './retrieval.service';

@Injectable()
export class DomainRetrievalService {
  private readonly logger = new Logger(DomainRetrievalService.name);

  constructor(
    private db:         DatabaseService,
    private embeddings: EmbeddingService,
  ) {}

  async retrieve(
    domainId: string,
    query:    string,
    opts:     RetrievalOptions = {},
  ): Promise<RetrievedChunk[]> {
    const matchCount = opts.matchCount ?? 10;
    const threshold  = opts.threshold  ?? 0.10;

    const queryEmbedding   = await this.embeddings.embedOne(query);
    const embeddingLiteral = DatabaseService.serializeEmbedding(queryEmbedding);

    const { data, error } = await this.db.client.rpc('match_domain_chunks', {
      p_domain_id:   domainId,
      p_embedding:   embeddingLiteral,
      p_match_count: matchCount,
      p_threshold:   threshold,
    });

    if (error) throw new Error(error.message);
    this.logger.debug(`Domain retrieval: ${data?.length ?? 0} chunks for domain ${domainId}`);
    return (data ?? []).map((c: any) => ({ ...c, similarity: c.similarity ?? 1 }));
  }

  formatContext(chunks: RetrievedChunk[]): string {
    if (chunks.length === 0) return 'No relevant source material found for this query.';
    return chunks.map(chunk => {
      const source = chunk.metadata?.source_file ?? 'unknown';
      const page   = chunk.metadata?.page ? `, page ${chunk.metadata.page}` : '';
      return `[Source: ${source}${page}]\n${chunk.content}`;
    }).join('\n---\n');
  }

  async retrieveAndFormat(domainId: string, query: string, opts?: RetrievalOptions) {
    const chunks  = await this.retrieve(domainId, query, opts);
    const context = this.formatContext(chunks);
    return { context, chunks };
  }
}

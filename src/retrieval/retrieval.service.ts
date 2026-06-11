import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService }  from '../common/database/database.service';
import { EmbeddingService } from '../ingest/embedding.service';

export interface RetrievedChunk {
  id:         string;
  content:    string;
  metadata:   Record<string, any>;
  similarity: number;
}

export interface RetrievalOptions {
  matchCount?: number;
  threshold?:  number;
}

@Injectable()
export class RetrievalService {
  private readonly logger = new Logger(RetrievalService.name);

  constructor(
    private db:         DatabaseService,
    private embeddings: EmbeddingService,
  ) {}

  async retrieve(
    courseId: string,
    query:    string,
    opts:     RetrievalOptions = {},
  ): Promise<RetrievedChunk[]> {
    const matchCount = opts.matchCount ?? 6;
    const threshold  = opts.threshold  ?? 0.70;

    this.logger.debug(`Retrieving top ${matchCount} chunks for course ${courseId}`);

    const queryEmbedding    = await this.embeddings.embedOne(query);
    const embeddingLiteral  = DatabaseService.serializeEmbedding(queryEmbedding);

    const { data, error } = await this.db.client.rpc('match_course_chunks', {
      p_course_id:   courseId,
      p_embedding:   embeddingLiteral,
      p_match_count: matchCount,
      p_threshold:   threshold,
    });

    if (error) throw new Error(error.message);

    this.logger.debug(`Retrieved ${data?.length ?? 0} chunks`);
    return (data ?? []).map((c: any) => ({ ...c, similarity: c.similarity ?? 1 }));
  }

  formatContext(chunks: RetrievedChunk[]): string {
    if (chunks.length === 0) return 'No relevant course material found for this query.';
    return chunks.map(chunk => {
      const source = chunk.metadata?.source_file ?? 'unknown';
      const page   = chunk.metadata?.page ? `, page ${chunk.metadata.page}` : '';
      return `[Source: ${source}${page}]\n${chunk.content}`;
    }).join('\n---\n');
  }

  async retrieveAndFormat(courseId: string, query: string, opts?: RetrievalOptions) {
    const chunks  = await this.retrieve(courseId, query, opts);
    const context = this.formatContext(chunks);
    return { context, chunks };
  }
}

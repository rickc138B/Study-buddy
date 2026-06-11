import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly apiKey: string;
  private readonly model = 'openai/text-embedding-3-small';
  private readonly batchSize = 100;

  constructor(private config: ConfigService) {
    this.apiKey = this.config.getOrThrow<string>('OPENROUTER_API_KEY');
  }

  async embedOne(text: string): Promise<number[]> {
    const [embedding] = await this.embedBatch([text]);
    return embedding;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const results: number[][] = [];

    for (let i = 0; i < texts.length; i += this.batchSize) {
      const batch = texts.slice(i, i + this.batchSize);
      this.logger.debug(`Embedding batch ${i / this.batchSize + 1} (${batch.length} items)`);

      const response = await fetch('https://openrouter.ai/api/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({ model: this.model, input: batch }),
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`OpenRouter embeddings error: ${response.status} ${err}`);
      }

      const data = await response.json() as { data: { index: number; embedding: number[] }[] };
      const sorted = data.data.sort((a, b) => a.index - b.index);
      results.push(...sorted.map(d => d.embedding));
    }

    return results;
  }
}

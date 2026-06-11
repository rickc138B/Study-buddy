// src/ingest/chunker.service.ts
import { Injectable } from '@nestjs/common';
import { ParsedPage } from './parser.service';
import { ChunkOptions, DEFAULT_CHUNK_OPTIONS, ChunkMetadata } from './ingest.types';

export interface RawChunk {
  content:     string;
  chunkIndex:  number;
  metadata:    ChunkMetadata;
}

@Injectable()
export class ChunkerService {

  /**
   * Split parsed pages into overlapping text chunks.
   * Strategy: sentence-aware splitting so chunks don't cut mid-sentence.
   */
  chunkPages(
    pages:      ParsedPage[],
    sourceFile: string,
    opts:       ChunkOptions = DEFAULT_CHUNK_OPTIONS,
  ): RawChunk[] {

    // Approximate tokens → characters (4 chars ≈ 1 token)
    const maxChars     = opts.maxTokens     * 4;
    const overlapChars = opts.overlapTokens * 4;

    const chunks: RawChunk[] = [];
    let chunkIndex = 0;

    for (const page of pages) {
      const sentences = this.splitIntoSentences(page.text);
      let buffer = '';

      for (const sentence of sentences) {
        const candidate = buffer ? `${buffer} ${sentence}` : sentence;

        if (candidate.length <= maxChars) {
          buffer = candidate;
        } else {
          // Flush current buffer as a chunk
          if (buffer.trim()) {
            chunks.push({
              content:    buffer.trim(),
              chunkIndex: chunkIndex++,
              metadata:   { page: page.pageNumber, source_file: sourceFile },
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
          content:    buffer.trim(),
          chunkIndex: chunkIndex++,
          metadata:   { page: page.pageNumber, source_file: sourceFile },
        });
        buffer = '';
      }
    }

    return chunks;
  }

  /** Naive but effective sentence splitter */
  private splitIntoSentences(text: string): string[] {
    return text
      .split(/(?<=[.!?])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }
}

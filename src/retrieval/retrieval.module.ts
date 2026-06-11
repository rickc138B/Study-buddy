import { Module }           from '@nestjs/common';
import { RetrievalService } from './retrieval.service';
import { EmbeddingService } from '../ingest/embedding.service';
import { DatabaseService }  from '../common/database/database.service';

@Module({
  providers: [RetrievalService, EmbeddingService, DatabaseService],
  exports:   [RetrievalService],
})
export class RetrievalModule {}

import { Module }                  from '@nestjs/common';
import { RetrievalService }        from './retrieval.service';
import { DomainRetrievalService }  from './domain-retrieval.service';
import { EmbeddingService }        from '../ingest/embedding.service';
import { DatabaseService }         from '../common/database/database.service';

@Module({
 providers: [RetrievalService, DomainRetrievalService, EmbeddingService, DatabaseService],
 exports:   [RetrievalService, DomainRetrievalService],
})
export class RetrievalModule {}

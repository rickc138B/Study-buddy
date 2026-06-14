import { Module }              from '@nestjs/common';
import { DatabaseService }     from '../common/database/database.service';
import { IngestController }    from './ingest.controller';
import { CoursesController }   from './courses.controller';
import { DomainsController }   from './domains.controller';
import { IngestService }       from './ingest.service';
import { ParserService }       from './parser.service';
import { ChunkerService }      from './chunker.service';
import { EmbeddingService }    from './embedding.service';

@Module({
  controllers: [IngestController, CoursesController, DomainsController],
  providers:   [IngestService, ParserService, ChunkerService, EmbeddingService, DatabaseService],
  exports:     [EmbeddingService],
})
export class IngestModule {}

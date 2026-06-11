import { UserModule } from './user/user.module';
import { Module }          from '@nestjs/common';
import { ConfigModule }    from '@nestjs/config';
import { IngestModule }    from './ingest/ingest.module';
import { RetrievalModule } from './retrieval/retrieval.module';
import { ChatModule }      from './chat/chat.module';

@Module({
  imports: [
    UserModule,
    ConfigModule.forRoot({ isGlobal: true }),
    IngestModule,
    RetrievalModule,
    ChatModule,
  ],
})
export class AppModule {}

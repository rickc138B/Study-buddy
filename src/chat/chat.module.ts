import { Module }                  from '@nestjs/common';
import { ChatController }          from './chat.controller';
import { ChatSessionsController }  from './chat-sessions.controller';
import { ChatService }             from './chat.service';
import { RetrievalModule }         from '../retrieval/retrieval.module';
import { UserModule }              from '../user/user.module';
import { DatabaseService }         from '../common/database/database.service';

@Module({
  imports:     [RetrievalModule, UserModule],
  controllers: [ChatController, ChatSessionsController],
  providers:   [ChatService, DatabaseService],
})
export class ChatModule {}

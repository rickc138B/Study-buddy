import { Module }          from '@nestjs/common';
import { ChatController }  from './chat.controller';
import { ChatService }     from './chat.service';
import { RetrievalModule } from '../retrieval/retrieval.module';
import { UserModule }      from '../user/user.module';

@Module({
  imports:     [RetrievalModule, UserModule],
  controllers: [ChatController],
  providers:   [ChatService, ],
})
export class ChatModule {}

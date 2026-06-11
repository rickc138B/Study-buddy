import {
  Controller, Post, Body, Res, HttpCode, HttpStatus, UseGuards,
} from '@nestjs/common';
import { Response }        from 'express';
import { ChatService }     from './chat.service';
import { UserService }     from '../user/user.service';
import { RateLimitGuard }  from '../common/guards/rate-limit.guard';
import { ChatMessage, StudyMode } from './chat.types';

interface ChatRequest {
  courseId:   string;
  message:    string;
  mode:       StudyMode;
  history:    ChatMessage[];
  telegramId?: number;
}

@Controller('chat')
export class ChatController {
  constructor(
    private chat:  ChatService,
    private users: UserService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  async stream(
    @Body() body: ChatRequest,
    @Res()  res:  Response,
  ) {
    res.setHeader('Content-Type',  'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection',    'keep-alive');
    res.flushHeaders();

    const { courseId, message, mode, history, telegramId } = body;

    // Resolve API config — user's own key takes priority
    let apiOverride: { apiKey: string; baseUrl: string; model: string } | null = null;
    if (telegramId) {
      apiOverride = await this.users.getApiConfig(telegramId);
    }

    try {
      for await (const chunk of this.chat.streamResponse(
        courseId, message, mode, history, apiOverride,
      )) {
        res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
      }
      // Increment usage after successful response (only for platform key users)
      if (telegramId && !apiOverride) {
        await this.users.incrementUsage(telegramId);
      }
    } catch (err: any) {
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    } finally {
      res.write('data: [DONE]\n\n');
      res.end();
    }
  }
}

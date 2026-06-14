import { Controller, Post, Get, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { DatabaseService } from '../common/database/database.service';

interface CreateSessionDto {
  domainId:  string;
  topicKey:  string;
}

interface SaveMessageDto {
  sessionId: string;
  role:      'user' | 'assistant';
  content:   string;
}

@Controller('sessions')
export class ChatSessionsController {
  constructor(private db: DatabaseService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createSession(@Body() dto: CreateSessionDto) {
    const { data, error } = await this.db.client
      .from('chat_sessions')
      .insert({ domain_id: dto.domainId, metadata: { topic_key: dto.topicKey } })
      .select().single();
    if (error) throw new Error(error.message);
    return data;
  }

  @Post('messages')
  @HttpCode(HttpStatus.CREATED)
  async saveMessage(@Body() dto: SaveMessageDto) {
    const { data, error } = await this.db.client
      .from('chat_messages')
      .insert({ session_id: dto.sessionId, role: dto.role, content: dto.content })
      .select().single();
    if (error) throw new Error(error.message);
    return data;
  }

  @Get(':sessionId/messages')
  async getMessages(@Param('sessionId') sessionId: string) {
    const { data, error } = await this.db.client
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  }
}

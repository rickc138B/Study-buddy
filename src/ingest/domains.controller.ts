import { Controller, Get, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { DatabaseService } from '../common/database/database.service';

interface CreateDomainDto {
  type:  'civic' | 'jamb' | 'academic';
  code:  string;
  title: string;
  metadata?: Record<string, any>;
}

@Controller('admin/domains')
export class DomainsController {
  constructor(private db: DatabaseService) {}

  @Get()
  async list() {
    const { data, error } = await this.db.client
      .from('knowledge_domains')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateDomainDto) {
    const { data, error } = await this.db.client
      .from('knowledge_domains')
      .insert({
        type:     dto.type,
        code:     dto.code.toUpperCase(),
        title:    dto.title,
        metadata: dto.metadata ?? {},
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }
}

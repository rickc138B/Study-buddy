import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class DatabaseService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseService.name);
  client: SupabaseClient;

  constructor(private config: ConfigService) {}

  onModuleInit() {
    this.client = createClient(
      this.config.getOrThrow<string>('SUPABASE_URL'),
      this.config.getOrThrow<string>('SUPABASE_SERVICE_KEY'),
    );
    this.logger.log('Supabase client ready');
  }

  async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
    const { data, error } = await this.client.rpc('run_sql', { query: sql, params });
    if (error) throw new Error(error.message);
    return data as T[];
  }

  async rpc<T = any>(fn: string, args: Record<string, any>): Promise<T[]> {
    const { data, error } = await this.client.rpc(fn, args);
    if (error) throw new Error(error.message);
    return data as T[];
  }

  async from<T = any>(table: string) {
    return this.client.from(table);
  }

  async transaction<T>(fn: (client: SupabaseClient) => Promise<T>): Promise<T> {
    // Supabase JS doesn't support transactions directly — operations are atomic per call
    return fn(this.client);
  }

  static serializeEmbedding(embedding: number[]): string {
    return `[${embedding.join(',')}]`;
  }
}

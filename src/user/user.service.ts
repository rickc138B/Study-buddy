import { Injectable, Logger } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

const ALGO    = 'aes-256-gcm';
const KEY_LEN = 32;

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);
  private readonly db: SupabaseClient;
  private readonly encKey: Buffer;

  constructor(private config: ConfigService) {
    this.db = createClient(
      config.getOrThrow('SUPABASE_URL'),
      config.getOrThrow('SUPABASE_SERVICE_KEY'),
    );
    const secret = config.getOrThrow<string>('ENCRYPTION_SECRET');
    this.encKey  = crypto.scryptSync(secret, 'studybot-salt', KEY_LEN);
  }

  async ensureUser(telegramId: number, displayName?: string) {
    const { error } = await this.db
      .from('user_settings')
      .upsert(
        { telegram_id: telegramId, display_name: displayName ?? null },
        { onConflict: 'telegram_id', ignoreDuplicates: true },
      );
    if (error) this.logger.error('ensureUser error', error.message);
  }

  async checkRateLimit(telegramId: number): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
    const { data } = await this.db
      .from('user_settings')
      .select('daily_limit, messages_today, limit_reset_at, is_premium')
      .eq('telegram_id', telegramId)
      .single();

    if (!data) return { allowed: true, remaining: 20, resetAt: new Date(Date.now() + 86_400_000) };

    if (new Date(data.limit_reset_at) <= new Date()) {
      await this.db
        .from('user_settings')
        .update({ messages_today: 0, limit_reset_at: new Date(Date.now() + 86_400_000) })
        .eq('telegram_id', telegramId);
      return { allowed: true, remaining: data.daily_limit, resetAt: new Date(Date.now() + 86_400_000) };
    }

    const remaining = data.daily_limit - data.messages_today;
    return {
      allowed:   data.is_premium || remaining > 0,
      remaining: Math.max(0, remaining),
      resetAt:   new Date(data.limit_reset_at),
    };
  }

  async incrementUsage(telegramId: number) {
    await this.db.rpc('increment_messages_today', { p_telegram_id: telegramId });
  }

  async setApiKey(telegramId: number, rawKey: string, baseUrl?: string, model?: string) {
    const enc = this.encrypt(rawKey);
    await this.db
      .from('user_settings')
      .update({
        api_key_enc:    enc,
        api_base_url:   baseUrl ?? 'https://openrouter.ai/api/v1',
        model_override: model ?? null,
      })
      .eq('telegram_id', telegramId);
  }

  async removeApiKey(telegramId: number) {
    await this.db
      .from('user_settings')
      .update({ api_key_enc: null, api_base_url: 'https://openrouter.ai/api/v1', model_override: null })
      .eq('telegram_id', telegramId);
  }

  async getApiConfig(telegramId: number): Promise<{ apiKey: string; baseUrl: string; model: string } | null> {
    const { data } = await this.db
      .from('user_settings')
      .select('api_key_enc, api_base_url, model_override')
      .eq('telegram_id', telegramId)
      .single();

    if (!data?.api_key_enc) return null;

    return {
      apiKey:  this.decrypt(data.api_key_enc),
      baseUrl: data.api_base_url ?? 'https://openrouter.ai/api/v1',
      model:   data.model_override ?? 'meta-llama/llama-4-maverick',
    };
  }

  private encrypt(text: string): string {
    const iv     = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGO, this.encKey, iv);
    const enc    = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    const tag    = cipher.getAuthTag();
    return [iv.toString('hex'), tag.toString('hex'), enc.toString('hex')].join(':');
  }

  private decrypt(stored: string): string {
    const [ivHex, tagHex, encHex] = stored.split(':');
    const decipher = crypto.createDecipheriv(ALGO, this.encKey, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    return decipher.update(Buffer.from(encHex, 'hex')) + decipher.final('utf8');
  }
}

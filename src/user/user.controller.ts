import { Controller, Post, Delete, Get, Body, Query } from '@nestjs/common';
import { UserService } from './user.service';

@Controller('users')
export class UserController {
  constructor(private users: UserService) {}

  @Post('ensure')
  async ensure(@Body() body: { telegramId: number; displayName?: string }) {
    await this.users.ensureUser(body.telegramId, body.displayName);
    return { ok: true };
  }

  @Post('apikey')
  async setKey(@Body() body: { telegramId: number; apiKey: string; baseUrl?: string; model?: string }) {
    await this.users.setApiKey(body.telegramId, body.apiKey, body.baseUrl, body.model);
    return { ok: true };
  }

  @Delete('apikey')
  async removeKey(@Body() body: { telegramId: number }) {
    await this.users.removeApiKey(body.telegramId);
    return { ok: true };
  }

  @Get('apikey/status')
  async keyStatus(@Query('telegramId') telegramId: string) {
    const id     = parseInt(telegramId);
    const config = await this.users.getApiConfig(id);
    const rate   = await this.users.checkRateLimit(id);
    return config
      ? { hasKey: true, model: config.model, baseUrl: config.baseUrl }
      : { hasKey: false, messagesUsed: 20 - rate.remaining, dailyLimit: 20, resetAt: rate.resetAt };
  }
}

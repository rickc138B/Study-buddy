import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { UserService } from '../../user/user.service';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private users: UserService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req  = ctx.switchToHttp().getRequest();
    const body = req.body as { telegramId?: number };

    if (!body?.telegramId) return true;

    const { allowed, remaining, resetAt } = await this.users.checkRateLimit(body.telegramId);

    if (!allowed) {
      const minutes = Math.ceil((resetAt.getTime() - Date.now()) / 60_000);
      throw new HttpException(
        { error: `Daily limit reached. Resets in ${minutes} min. Use /apikey to add your own key for unlimited access.` },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    req.rateLimitRemaining = remaining;
    return true;
  }
}

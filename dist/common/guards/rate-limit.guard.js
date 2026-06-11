"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimitGuard = void 0;
const common_1 = require("@nestjs/common");
const user_service_1 = require("../../user/user.service");
let RateLimitGuard = class RateLimitGuard {
    constructor(users) {
        this.users = users;
    }
    async canActivate(ctx) {
        const req = ctx.switchToHttp().getRequest();
        const body = req.body;
        if (!body?.telegramId)
            return true;
        const { allowed, remaining, resetAt } = await this.users.checkRateLimit(body.telegramId);
        if (!allowed) {
            const minutes = Math.ceil((resetAt.getTime() - Date.now()) / 60000);
            throw new common_1.HttpException({ error: `Daily limit reached. Resets in ${minutes} min. Use /apikey to add your own key for unlimited access.` }, common_1.HttpStatus.TOO_MANY_REQUESTS);
        }
        req.rateLimitRemaining = remaining;
        return true;
    }
};
exports.RateLimitGuard = RateLimitGuard;
exports.RateLimitGuard = RateLimitGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [user_service_1.UserService])
], RateLimitGuard);
//# sourceMappingURL=rate-limit.guard.js.map
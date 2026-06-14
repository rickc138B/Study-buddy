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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatController = void 0;
const common_1 = require("@nestjs/common");
const chat_service_1 = require("./chat.service");
const user_service_1 = require("../user/user.service");
const rate_limit_guard_1 = require("../common/guards/rate-limit.guard");
let ChatController = class ChatController {
    constructor(chat, users) {
        this.chat = chat;
        this.users = users;
    }
    async stream(body, res) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();
        const { courseId, domainId, message, mode, history, telegramId } = body;
        const resolvedId = domainId ?? courseId;
        // Resolve API config — user's own key takes priority
        let apiOverride = null;
        if (telegramId) {
            apiOverride = await this.users.getApiConfig(telegramId);
        }
        try {
            for await (const chunk of this.chat.streamResponse(resolvedId, message, mode, history, apiOverride)) {
                res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
            }
            // Increment usage after successful response (only for platform key users)
            if (telegramId && !apiOverride) {
                await this.users.incrementUsage(telegramId);
            }
        }
        catch (err) {
            res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
        }
        finally {
            res.write('data: [DONE]\n\n');
            res.end();
        }
    }
};
exports.ChatController = ChatController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.UseGuards)(rate_limit_guard_1.RateLimitGuard),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "stream", null);
exports.ChatController = ChatController = __decorate([
    (0, common_1.Controller)('chat'),
    __metadata("design:paramtypes", [chat_service_1.ChatService,
        user_service_1.UserService])
], ChatController);
//# sourceMappingURL=chat.controller.js.map
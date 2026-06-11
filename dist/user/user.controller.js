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
exports.UserController = void 0;
const common_1 = require("@nestjs/common");
const user_service_1 = require("./user.service");
let UserController = class UserController {
    constructor(users) {
        this.users = users;
    }
    async ensure(body) {
        await this.users.ensureUser(body.telegramId, body.displayName);
        return { ok: true };
    }
    async setKey(body) {
        await this.users.setApiKey(body.telegramId, body.apiKey, body.baseUrl, body.model);
        return { ok: true };
    }
    async removeKey(body) {
        await this.users.removeApiKey(body.telegramId);
        return { ok: true };
    }
    async keyStatus(telegramId) {
        const id = parseInt(telegramId);
        const config = await this.users.getApiConfig(id);
        const rate = await this.users.checkRateLimit(id);
        return config
            ? { hasKey: true, model: config.model, baseUrl: config.baseUrl }
            : { hasKey: false, messagesUsed: 20 - rate.remaining, dailyLimit: 20, resetAt: rate.resetAt };
    }
};
exports.UserController = UserController;
__decorate([
    (0, common_1.Post)('ensure'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "ensure", null);
__decorate([
    (0, common_1.Post)('apikey'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "setKey", null);
__decorate([
    (0, common_1.Delete)('apikey'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "removeKey", null);
__decorate([
    (0, common_1.Get)('apikey/status'),
    __param(0, (0, common_1.Query)('telegramId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "keyStatus", null);
exports.UserController = UserController = __decorate([
    (0, common_1.Controller)('users'),
    __metadata("design:paramtypes", [user_service_1.UserService])
], UserController);
//# sourceMappingURL=user.controller.js.map
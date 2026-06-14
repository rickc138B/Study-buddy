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
exports.ChatSessionsController = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../common/database/database.service");
let ChatSessionsController = class ChatSessionsController {
    constructor(db) {
        this.db = db;
    }
    async createSession(dto) {
        const { data, error } = await this.db.client
            .from('chat_sessions')
            .insert({ domain_id: dto.domainId, metadata: { topic_key: dto.topicKey } })
            .select().single();
        if (error)
            throw new Error(error.message);
        return data;
    }
    async saveMessage(dto) {
        const { data, error } = await this.db.client
            .from('chat_messages')
            .insert({ session_id: dto.sessionId, role: dto.role, content: dto.content })
            .select().single();
        if (error)
            throw new Error(error.message);
        return data;
    }
    async getMessages(sessionId) {
        const { data, error } = await this.db.client
            .from('chat_messages')
            .select('*')
            .eq('session_id', sessionId)
            .order('created_at', { ascending: true });
        if (error)
            throw new Error(error.message);
        return data ?? [];
    }
};
exports.ChatSessionsController = ChatSessionsController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ChatSessionsController.prototype, "createSession", null);
__decorate([
    (0, common_1.Post)('messages'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ChatSessionsController.prototype, "saveMessage", null);
__decorate([
    (0, common_1.Get)(':sessionId/messages'),
    __param(0, (0, common_1.Param)('sessionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ChatSessionsController.prototype, "getMessages", null);
exports.ChatSessionsController = ChatSessionsController = __decorate([
    (0, common_1.Controller)('sessions'),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], ChatSessionsController);
//# sourceMappingURL=chat-sessions.controller.js.map
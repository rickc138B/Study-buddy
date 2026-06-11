"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var UserService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const common_1 = require("@nestjs/common");
const supabase_js_1 = require("@supabase/supabase-js");
const config_1 = require("@nestjs/config");
const crypto = __importStar(require("crypto"));
const ALGO = 'aes-256-gcm';
const KEY_LEN = 32;
let UserService = UserService_1 = class UserService {
    constructor(config) {
        this.config = config;
        this.logger = new common_1.Logger(UserService_1.name);
        this.db = (0, supabase_js_1.createClient)(config.getOrThrow('SUPABASE_URL'), config.getOrThrow('SUPABASE_SERVICE_KEY'));
        const secret = config.getOrThrow('ENCRYPTION_SECRET');
        this.encKey = crypto.scryptSync(secret, 'studybot-salt', KEY_LEN);
    }
    async ensureUser(telegramId, displayName) {
        const { error } = await this.db
            .from('user_settings')
            .upsert({ telegram_id: telegramId, display_name: displayName ?? null }, { onConflict: 'telegram_id', ignoreDuplicates: true });
        if (error)
            this.logger.error('ensureUser error', error.message);
    }
    async checkRateLimit(telegramId) {
        const { data } = await this.db
            .from('user_settings')
            .select('daily_limit, messages_today, limit_reset_at, is_premium')
            .eq('telegram_id', telegramId)
            .single();
        if (!data)
            return { allowed: true, remaining: 20, resetAt: new Date(Date.now() + 86400000) };
        if (new Date(data.limit_reset_at) <= new Date()) {
            await this.db
                .from('user_settings')
                .update({ messages_today: 0, limit_reset_at: new Date(Date.now() + 86400000) })
                .eq('telegram_id', telegramId);
            return { allowed: true, remaining: data.daily_limit, resetAt: new Date(Date.now() + 86400000) };
        }
        const remaining = data.daily_limit - data.messages_today;
        return {
            allowed: data.is_premium || remaining > 0,
            remaining: Math.max(0, remaining),
            resetAt: new Date(data.limit_reset_at),
        };
    }
    async incrementUsage(telegramId) {
        await this.db.rpc('increment_messages_today', { p_telegram_id: telegramId });
    }
    async setApiKey(telegramId, rawKey, baseUrl, model) {
        const enc = this.encrypt(rawKey);
        await this.db
            .from('user_settings')
            .update({
            api_key_enc: enc,
            api_base_url: baseUrl ?? 'https://openrouter.ai/api/v1',
            model_override: model ?? null,
        })
            .eq('telegram_id', telegramId);
    }
    async removeApiKey(telegramId) {
        await this.db
            .from('user_settings')
            .update({ api_key_enc: null, api_base_url: 'https://openrouter.ai/api/v1', model_override: null })
            .eq('telegram_id', telegramId);
    }
    async getApiConfig(telegramId) {
        const { data } = await this.db
            .from('user_settings')
            .select('api_key_enc, api_base_url, model_override')
            .eq('telegram_id', telegramId)
            .single();
        if (!data?.api_key_enc)
            return null;
        return {
            apiKey: this.decrypt(data.api_key_enc),
            baseUrl: data.api_base_url ?? 'https://openrouter.ai/api/v1',
            model: data.model_override ?? 'meta-llama/llama-4-maverick',
        };
    }
    encrypt(text) {
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv(ALGO, this.encKey, iv);
        const enc = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
        const tag = cipher.getAuthTag();
        return [iv.toString('hex'), tag.toString('hex'), enc.toString('hex')].join(':');
    }
    decrypt(stored) {
        const [ivHex, tagHex, encHex] = stored.split(':');
        const decipher = crypto.createDecipheriv(ALGO, this.encKey, Buffer.from(ivHex, 'hex'));
        decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
        return decipher.update(Buffer.from(encHex, 'hex')) + decipher.final('utf8');
    }
};
exports.UserService = UserService;
exports.UserService = UserService = UserService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], UserService);
//# sourceMappingURL=user.service.js.map
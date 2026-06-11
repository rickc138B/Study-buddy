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
var DatabaseService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const supabase_js_1 = require("@supabase/supabase-js");
let DatabaseService = DatabaseService_1 = class DatabaseService {
    constructor(config) {
        this.config = config;
        this.logger = new common_1.Logger(DatabaseService_1.name);
    }
    onModuleInit() {
        this.client = (0, supabase_js_1.createClient)(this.config.getOrThrow('SUPABASE_URL'), this.config.getOrThrow('SUPABASE_SERVICE_KEY'));
        this.logger.log('Supabase client ready');
    }
    async query(sql, params) {
        const { data, error } = await this.client.rpc('run_sql', { query: sql, params });
        if (error)
            throw new Error(error.message);
        return data;
    }
    async rpc(fn, args) {
        const { data, error } = await this.client.rpc(fn, args);
        if (error)
            throw new Error(error.message);
        return data;
    }
    async from(table) {
        return this.client.from(table);
    }
    async transaction(fn) {
        // Supabase JS doesn't support transactions directly — operations are atomic per call
        return fn(this.client);
    }
    static serializeEmbedding(embedding) {
        return `[${embedding.join(',')}]`;
    }
};
exports.DatabaseService = DatabaseService;
exports.DatabaseService = DatabaseService = DatabaseService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], DatabaseService);
//# sourceMappingURL=database.service.js.map
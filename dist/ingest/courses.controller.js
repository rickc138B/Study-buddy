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
exports.CoursesController = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../common/database/database.service");
let CoursesController = class CoursesController {
    constructor(db) {
        this.db = db;
    }
    async list() {
        const { data, error } = await this.db.client
            .from('courses').select('*, departments(name, code)').order('code');
        if (error)
            throw new Error(error.message);
        return data ?? [];
    }
    async create(body) {
        const { data, error } = await this.db.client
            .from('courses').insert({
            code: body.code,
            title: body.title,
            level: body.level,
            description: body.description,
            department_id: body.departmentId,
        }).select().single();
        if (error)
            throw new Error(error.message);
        return data;
    }
    async delete(id) {
        await this.db.client.from('courses').delete().eq('id', id);
    }
    async departments() {
        const { data, error } = await this.db.client
            .from('departments').select('*').order('name');
        if (error)
            throw new Error(error.message);
        return data ?? [];
    }
    async createDepartment(body) {
        const { data, error } = await this.db.client
            .from('departments').insert({ code: body.code, name: body.name })
            .select().single();
        if (error)
            throw new Error(error.message);
        return data;
    }
};
exports.CoursesController = CoursesController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CoursesController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CoursesController.prototype, "create", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CoursesController.prototype, "delete", null);
__decorate([
    (0, common_1.Get)('departments'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CoursesController.prototype, "departments", null);
__decorate([
    (0, common_1.Post)('departments'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CoursesController.prototype, "createDepartment", null);
exports.CoursesController = CoursesController = __decorate([
    (0, common_1.Controller)('admin/courses'),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], CoursesController);
//# sourceMappingURL=courses.controller.js.map
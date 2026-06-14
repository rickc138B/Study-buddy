"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RetrievalModule = void 0;
const common_1 = require("@nestjs/common");
const retrieval_service_1 = require("./retrieval.service");
const domain_retrieval_service_1 = require("./domain-retrieval.service");
const embedding_service_1 = require("../ingest/embedding.service");
const database_service_1 = require("../common/database/database.service");
let RetrievalModule = class RetrievalModule {
};
exports.RetrievalModule = RetrievalModule;
exports.RetrievalModule = RetrievalModule = __decorate([
    (0, common_1.Module)({
        providers: [retrieval_service_1.RetrievalService, domain_retrieval_service_1.DomainRetrievalService, embedding_service_1.EmbeddingService, database_service_1.DatabaseService],
        exports: [retrieval_service_1.RetrievalService, domain_retrieval_service_1.DomainRetrievalService],
    })
], RetrievalModule);
//# sourceMappingURL=retrieval.module.js.map
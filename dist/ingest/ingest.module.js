"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IngestModule = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../common/database/database.service");
const ingest_controller_1 = require("./ingest.controller");
const courses_controller_1 = require("./courses.controller");
const domains_controller_1 = require("./domains.controller");
const domain_ingest_controller_1 = require("./domain-ingest.controller");
const ingest_service_1 = require("./ingest.service");
const domain_ingest_service_1 = require("./domain-ingest.service");
const parser_service_1 = require("./parser.service");
const chunker_service_1 = require("./chunker.service");
const embedding_service_1 = require("./embedding.service");
let IngestModule = class IngestModule {
};
exports.IngestModule = IngestModule;
exports.IngestModule = IngestModule = __decorate([
    (0, common_1.Module)({
        controllers: [ingest_controller_1.IngestController, courses_controller_1.CoursesController, domains_controller_1.DomainsController, domain_ingest_controller_1.DomainIngestController],
        providers: [ingest_service_1.IngestService, domain_ingest_service_1.DomainIngestService, parser_service_1.ParserService, chunker_service_1.ChunkerService, embedding_service_1.EmbeddingService, database_service_1.DatabaseService],
        exports: [embedding_service_1.EmbeddingService],
    })
], IngestModule);
//# sourceMappingURL=ingest.module.js.map
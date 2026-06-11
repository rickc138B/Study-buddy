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
var ParserService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParserService = void 0;
// src/ingest/parser.service.ts
const common_1 = require("@nestjs/common");
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
let ParserService = ParserService_1 = class ParserService {
    constructor() {
        this.logger = new common_1.Logger(ParserService_1.name);
    }
    async parse(filePath, mimeType) {
        this.logger.log(`Parsing ${path.basename(filePath)} [${mimeType}]`);
        switch (mimeType) {
            case 'application/pdf':
                return this.parsePdf(filePath);
            case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
                return this.parseDocx(filePath);
            case 'text/plain':
                return this.parseTxt(filePath);
            default:
                throw new common_1.UnsupportedMediaTypeException(`Unsupported mime type: ${mimeType}`);
        }
    }
    // ─── PDF ────────────────────────────────────────────────────────────────────
    async parsePdf(filePath) {
        // Dynamic import — add pdf-parse to package.json
        // npm install pdf-parse @types/pdf-parse
        const pdfParse = (await Promise.resolve().then(() => __importStar(require('pdf-parse')))).default;
        const buffer = await fs.readFile(filePath);
        const pages = [];
        let currentPage = 0;
        await pdfParse(buffer, {
            pagerender: (pageData) => {
                currentPage++;
                return pageData.getTextContent().then((content) => {
                    const text = content.items
                        .map((item) => item.str)
                        .join(' ')
                        .replace(/\s+/g, ' ')
                        .trim();
                    if (text)
                        pages.push({ pageNumber: currentPage, text });
                    return text;
                });
            },
        });
        // Fallback: if pagerender didn't fire (some PDF versions), use top-level text
        if (pages.length === 0) {
            const result = await pdfParse(buffer);
            pages.push({ pageNumber: 1, text: result.text });
        }
        return {
            pages,
            totalText: pages.map(p => p.text).join('\n\n'),
        };
    }
    // ─── DOCX ───────────────────────────────────────────────────────────────────
    async parseDocx(filePath) {
        // npm install mammoth
        const mammoth = await Promise.resolve().then(() => __importStar(require('mammoth')));
        const result = await mammoth.extractRawText({ path: filePath });
        if (result.messages.length) {
            this.logger.warn(`DOCX warnings for ${filePath}:`, result.messages);
        }
        const text = result.value.replace(/\s+/g, ' ').trim();
        return {
            pages: [{ pageNumber: 1, text }],
            totalText: text,
        };
    }
    // ─── TXT ────────────────────────────────────────────────────────────────────
    async parseTxt(filePath) {
        const text = await fs.readFile(filePath, 'utf-8');
        return {
            pages: [{ pageNumber: 1, text: text.replace(/\s+/g, ' ').trim() }],
            totalText: text,
        };
    }
};
exports.ParserService = ParserService;
exports.ParserService = ParserService = ParserService_1 = __decorate([
    (0, common_1.Injectable)()
], ParserService);
//# sourceMappingURL=parser.service.js.map
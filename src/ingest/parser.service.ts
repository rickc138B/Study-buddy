// src/ingest/parser.service.ts
import { Injectable, Logger, UnsupportedMediaTypeException } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface ParsedDocument {
  pages: ParsedPage[];
  totalText: string;
}

export interface ParsedPage {
  pageNumber: number;
  text:       string;
}

@Injectable()
export class ParserService {
  private readonly logger = new Logger(ParserService.name);

  async parse(filePath: string, mimeType: string): Promise<ParsedDocument> {
    this.logger.log(`Parsing ${path.basename(filePath)} [${mimeType}]`);

    switch (mimeType) {
      case 'application/pdf':
        return this.parsePdf(filePath);
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return this.parseDocx(filePath);
      case 'text/plain':
        return this.parseTxt(filePath);
      default:
        throw new UnsupportedMediaTypeException(`Unsupported mime type: ${mimeType}`);
    }
  }

  // ─── PDF ────────────────────────────────────────────────────────────────────
  private async parsePdf(filePath: string): Promise<ParsedDocument> {
    // Dynamic import — add pdf-parse to package.json
    // npm install pdf-parse @types/pdf-parse
    const pdfParse = (await import('pdf-parse')).default;
    const buffer   = await fs.readFile(filePath);

    const pages: ParsedPage[] = [];
    let currentPage = 0;

    await pdfParse(buffer, {
      pagerender: (pageData: any) => {
        currentPage++;
        return pageData.getTextContent().then((content: any) => {
          const text = content.items
            .map((item: any) => item.str)
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();
          if (text) pages.push({ pageNumber: currentPage, text });
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
  private async parseDocx(filePath: string): Promise<ParsedDocument> {
    // npm install mammoth
    const mammoth = await import('mammoth');
    const result  = await mammoth.extractRawText({ path: filePath });

    if (result.messages.length) {
      this.logger.warn(`DOCX warnings for ${filePath}:`, result.messages);
    }

    const text = result.value.replace(/\s+/g, ' ').trim();
    return {
      pages:     [{ pageNumber: 1, text }],
      totalText: text,
    };
  }

  // ─── TXT ────────────────────────────────────────────────────────────────────
  private async parseTxt(filePath: string): Promise<ParsedDocument> {
    const text = await fs.readFile(filePath, 'utf-8');
    return {
      pages:     [{ pageNumber: 1, text: text.replace(/\s+/g, ' ').trim() }],
      totalText: text,
    };
  }
}

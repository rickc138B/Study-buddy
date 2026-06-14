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
var ChatService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const retrieval_service_1 = require("../retrieval/retrieval.service");
const domain_retrieval_service_1 = require("../retrieval/domain-retrieval.service");
let ChatService = ChatService_1 = class ChatService {
    constructor(retrieval, domainRetrieval, config) {
        this.retrieval = retrieval;
        this.domainRetrieval = domainRetrieval;
        this.config = config;
        this.logger = new common_1.Logger(ChatService_1.name);
        this.model = 'meta-llama/llama-4-maverick';
        // ─── Main streaming entry point ──────────────────────────────────────────
        // Civic domain IDs — add new ones here as they're created
        this.CIVIC_DOMAINS = new Set([
            '1fccae5b-a8e0-415f-ad54-ac2070764a51', // ELECTIONS_2027
        ]);
        this.apiKey = this.config.getOrThrow('OPENROUTER_API_KEY');
    }
    async *streamResponse(courseId, message, mode, history, apiOverride = null) {
        const apiKey = apiOverride?.apiKey ?? this.apiKey;
        const baseUrl = apiOverride?.baseUrl ?? 'https://openrouter.ai/api/v1';
        const model = apiOverride?.model ?? this.model;
        const isCivic = this.CIVIC_DOMAINS.has(courseId);
        const isQuizRequest = this.detectQuizIntent(message);
        if (isQuizRequest && mode !== 'summary' && !isCivic) {
            yield* this.streamQuiz(courseId, message);
            return;
        }
        const { context } = isCivic
            ? await this.domainRetrieval.retrieveAndFormat(courseId, message)
            : await this.retrieval.retrieveAndFormat(courseId, message);
        const systemPrompt = isCivic
            ? this.buildCivicSystemPrompt(context)
            : this.buildSystemPrompt(mode, context);
        const messages = [
            ...history.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: message },
        ];
        const response = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: model,
                stream: true,
                messages: [{ role: 'system', content: systemPrompt }, ...messages],
            }),
        });
        if (!response.ok || !response.body) {
            throw new Error(`OpenRouter error: ${response.status}`);
        }
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (true) {
            const { done, value } = await reader.read();
            if (done)
                break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed.startsWith('data: '))
                    continue;
                const data = trimmed.slice(6);
                if (data === '[DONE]')
                    return;
                try {
                    const parsed = JSON.parse(data);
                    const text = parsed.choices?.[0]?.delta?.content;
                    if (text)
                        yield text;
                }
                catch {
                    // malformed chunk — skip
                }
            }
        }
    }
    // ─── Quiz flow ────────────────────────────────────────────────────────────
    async *streamQuiz(courseId, topic) {
        const { context } = await this.retrieval.retrieveAndFormat(courseId, topic);
        const prompt = `You are a university exam question generator.
Using ONLY the course material below, generate exactly 5 multiple-choice questions on: "${topic}".

Course material:
${context}

STRICT FORMAT — output ONLY this JSON array, no markdown fences, no extra text:
[
  {
    "question": "...",
    "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
    "answer": "A",
    "explain": "One sentence explaining why this is correct."
  }
]`;
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: this.model,
                stream: false,
                messages: [{ role: 'user', content: prompt }],
            }),
        });
        if (!response.ok)
            throw new Error(`Quiz generation failed: ${response.status}`);
        const data = await response.json();
        const raw = data.content
            ? data.content.map((b) => b.text ?? '').join('')
            : data.choices?.[0]?.message?.content ?? '';
        let questions = [];
        try {
            const cleaned = raw.replace(/```json|```/g, '').trim();
            questions = JSON.parse(cleaned);
        }
        catch {
            yield 'Sorry, I had trouble generating questions for that topic. Try rephrasing — e.g. "quiz me on recursion".';
            return;
        }
        // Stream the quiz as interactive markdown the client can render
        yield `__QUIZ_START__\n`;
        yield JSON.stringify(questions);
        yield `\n__QUIZ_END__`;
    }
    // ─── System prompts ───────────────────────────────────────────────────────
    buildSystemPrompt(mode, context) {
        const base = `You are a university study assistant. Use ONLY the course material provided.
If the answer isn't in the material, say "That topic isn't in your course materials — check your lecturer's notes."
Never fabricate facts, formulas, or exam answers.

COURSE MATERIAL:
${context}
---`;
        const modePrompts = {
            // ── STUDY MODE ────────────────────────────────────────────────────────
            study: `${base}

MODE: SOCRATIC TUTOR
Your job is to build understanding, not just give answers.

Rules:
- Explain concepts clearly with real examples from everyday Nigerian life where it helps
- After explaining something, ask ONE follow-up question to check understanding
  e.g. "Does that make sense? Let me ask: if you had a list of 1000 names, which algorithm from above would you use and why?"
- If the student gets your question wrong, gently correct and re-explain that part only
- Use analogies. Abstract concepts land better with concrete parallels.
- Format: short paragraphs, bold key terms, use numbered steps for processes
- Never dump everything at once — build up the concept in layers`,
            // ── EXAM MODE ────────────────────────────────────────────────────────
            exam: `${base}

MODE: EXAM COACH
You are preparing the student for their upcoming exam. Be direct and strategic.

Rules:
- Lead with: "Here are the most likely exam questions on [topic]:" then list 3–5 predicted questions
  based on the course material — past patterns, definitions, and application questions
- After listing predictions, say "Which of these do you want to practice answering?"
- When the student attempts an answer: grade it (✓ Correct / ✗ Incorrect / ⚠ Partial),
  then explain exactly what was missing or wrong
- Call out the specific phrases/definitions lecturers want to see in answers
- End every response with: "⚡ Exam tip:" followed by one tactical point
- Be concise. Students in exam prep don't want essays.`,
            // ── SUMMARY MODE ─────────────────────────────────────────────────────
            summary: `${base}

MODE: REVISION SUMMARY GENERATOR
The student needs to review quickly — possibly the night before an exam.

Rules:
- Format EVERY response as a clean, structured revision note they can screenshot
- Structure:
  📌 **[Topic Name]**
  
  **Key Definitions** (one line each)
  - Term: definition
  
  **Core Concepts** (the 3–5 things that actually matter)
  1. ...
  
  **Common Exam Questions**
  - ...
  
  **Remember** (the one thing to memorise)
  > ...

- No paragraphs, no waffle, no "great question!"
- If asked about multiple topics, do each as a separate block with a divider
- Keep definitions tight — exam boards want precision, not essays`,
        };
        return modePrompts[mode];
    }
    // ─── Civic system prompt ─────────────────────────────────────────────────
    buildCivicSystemPrompt(context) {
        return `You are a neutral civic information assistant for Nigerian voters preparing for the 2027 elections.
Always cite your sources using the format [Source: filename, page X].
Never express political opinions or favor any candidate or party.
If the answer is not in the provided context, say clearly: "I don't have verified information on that — please check INEC's official resources at inec.gov.ng."
Answer in plain, accessible English. Use Nigerian examples where helpful.

Context:
${context}`;
    }
    // ─── Intent detection ─────────────────────────────────────────────────────
    detectQuizIntent(message) {
        const lower = message.toLowerCase();
        return (lower.includes('quiz') ||
            lower.includes('test me') ||
            lower.includes('practice question') ||
            lower.includes('mcq') ||
            lower.includes('multiple choice') ||
            lower.includes('exam question') ||
            lower.includes('likely') ||
            (lower.includes('question') && lower.includes('on ')));
    }
};
exports.ChatService = ChatService;
exports.ChatService = ChatService = ChatService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [retrieval_service_1.RetrievalService,
        domain_retrieval_service_1.DomainRetrievalService,
        config_1.ConfigService])
], ChatService);
//# sourceMappingURL=chat.service.js.map
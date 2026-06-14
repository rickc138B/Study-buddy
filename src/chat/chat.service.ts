import { Injectable, Logger } from '@nestjs/common';
import { ConfigService }            from '@nestjs/config';
import { RetrievalService }         from '../retrieval/retrieval.service';
import { DomainRetrievalService }   from '../retrieval/domain-retrieval.service';
import { ChatMessage, StudyMode } from './chat.types';

// ─── Quiz state parsed from LLM output ───────────────────────────────────────
interface QuizQuestion {
  question: string;
  options:  string[];          // ['A) ...', 'B) ...', ...]
  answer:   string;            // 'A'
  explain:  string;
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly apiKey: string;
  private readonly model = 'meta-llama/llama-4-maverick';

  constructor(
    private retrieval:       RetrievalService,
    private domainRetrieval: DomainRetrievalService,
    private config:          ConfigService,
  ) {
    this.apiKey = this.config.getOrThrow<string>('OPENROUTER_API_KEY');
  }

  // ─── Main streaming entry point ──────────────────────────────────────────
  // Civic domain IDs — add new ones here as they're created
  private readonly CIVIC_DOMAINS = new Set([
    '1fccae5b-a8e0-415f-ad54-ac2070764a51', // ELECTIONS_2027
  ]);

  async *streamResponse(
    courseId:    string,
    message:     string,
    mode:        StudyMode,
    history:     ChatMessage[],
    apiOverride: { apiKey: string; baseUrl: string; model: string } | null = null,
  ): AsyncGenerator<string> {
    const apiKey  = apiOverride?.apiKey  ?? this.apiKey;
    const baseUrl = apiOverride?.baseUrl ?? 'https://openrouter.ai/api/v1';
    const model   = apiOverride?.model   ?? this.model;
    const isCivic = this.CIVIC_DOMAINS.has(courseId);
    const isQuizRequest = this.detectQuizIntent(message);

    if (isQuizRequest && mode !== 'summary' && !isCivic) {
      yield* this.streamQuiz(courseId, message);
      return;
    }

    const { context, chunks } = isCivic
      ? await this.domainRetrieval.retrieveAndFormat(courseId, message)
      : await this.retrieval.retrieveAndFormat(courseId, message);
    
    // Emit sources before streaming text
    if (chunks && chunks.length > 0) {
      const sources = chunks.map(c => ({
        source_file: c.metadata?.source_file ?? 'unknown',
        page:        c.metadata?.page ?? null,
        content:     c.content.slice(0, 300),
      }));
      yield `__SOURCES__${JSON.stringify(sources)}__SOURCES_END__`;
    }
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
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        model:  model,
        stream: true,
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
      }),
    });

    if (!response.ok || !response.body) {
      throw new Error(`OpenRouter error: ${response.status}`);
    }

    const reader  = response.body.getReader();
    const decoder = new TextDecoder();
    let   buffer  = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ')) continue;
        const data = trimmed.slice(6);
        if (data === '[DONE]') return;

        try {
          const parsed = JSON.parse(data);
          const text   = parsed.choices?.[0]?.delta?.content;
          if (text) yield text;
        } catch {
          // malformed chunk — skip
        }
      }
    }
  }

  // ─── Quiz flow ────────────────────────────────────────────────────────────
  private async *streamQuiz(courseId: string, topic: string): AsyncGenerator<string> {
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
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        model:    this.model,
        stream:   false,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) throw new Error(`Quiz generation failed: ${response.status}`);

    const data: any = await response.json();
    const raw  = data.content
      ? data.content.map((b: any) => b.text ?? '').join('')
      : data.choices?.[0]?.message?.content ?? '';

    let questions: QuizQuestion[] = [];
    try {
      const cleaned = raw.replace(/```json|```/g, '').trim();
      questions = JSON.parse(cleaned);
    } catch {
      yield 'Sorry, I had trouble generating questions for that topic. Try rephrasing — e.g. "quiz me on recursion".';
      return;
    }

    // Stream the quiz as interactive markdown the client can render
    yield `__QUIZ_START__\n`;
    yield JSON.stringify(questions);
    yield `\n__QUIZ_END__`;
  }

  // ─── System prompts ───────────────────────────────────────────────────────
  private buildSystemPrompt(mode: StudyMode, context: string): string {
    const base = `You are a university study assistant. Use ONLY the course material provided.
If the answer isn't in the material, say "That topic isn't in your course materials — check your lecturer's notes."
Never fabricate facts, formulas, or exam answers.

COURSE MATERIAL:
${context}
---`;

    const modePrompts: Record<StudyMode, string> = {

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
  private buildCivicSystemPrompt(context: string): string {
    return `You are a neutral civic information assistant for Nigerian voters preparing for the 2027 elections.
Always cite your sources using the format [Source: filename, page X].
Never express political opinions or favor any candidate or party.
If the answer is not in the provided context, say clearly: "I don't have verified information on that — please check INEC's official resources at inec.gov.ng."
Answer in plain, accessible English. Use Nigerian examples where helpful.

Context:
${context}`;
  }

  // ─── Intent detection ─────────────────────────────────────────────────────
  private detectQuizIntent(message: string): boolean {
    const lower = message.toLowerCase();
    return (
      lower.includes('quiz') ||
      lower.includes('test me') ||
      lower.includes('practice question') ||
      lower.includes('mcq') ||
      lower.includes('multiple choice') ||
      lower.includes('exam question') ||
      lower.includes('likely') ||
      (lower.includes('question') && lower.includes('on '))
    );
  }
}

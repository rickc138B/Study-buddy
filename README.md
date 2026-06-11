# StudyBot — AI Course Assistant

An AI-powered study assistant that answers questions from actual university course materials.
Built with NestJS, Supabase (pgvector), OpenRouter, and Telegram.

---

## Architecture

    Telegram Bot / Web Client
            |
    NestJS API (port 3000)
            |
    RAG Pipeline
      - EmbeddingService   -> OpenRouter (text-embedding-3-small)
      - RetrievalService   -> Supabase pgvector similarity search
      - ChatService        -> OpenRouter (Llama 4 Maverick) streaming
            |
    Supabase (PostgreSQL + pgvector)
      - departments
      - courses
      - course_materials
      - course_chunks      (embeddings)
      - user_settings      (rate limits + BYOK)

---

## Stack

| Layer       | Technology                        |
|-------------|-----------------------------------|
| API         | NestJS (TypeScript)               |
| Database    | Supabase (PostgreSQL + pgvector)  |
| Embeddings  | OpenRouter text-embedding-3-small |
| LLM         | Llama 4 Maverick via OpenRouter   |
| Bot         | Telegraf (Telegram)               |
| Process mgr | PM2                               |
| Hosting     | Self-hosted on maria (homelab)    |

---

## Study Modes

- Study    — Socratic tutor, explains concepts, asks follow-up questions
- Exam     — Predicts likely exam questions, grades practice answers
- Summary  — Screenshot-ready revision notes

Quiz flow triggered by: "quiz me on X", "test me", "MCQ", "multiple choice"

---

## Rate Limiting and BYOK

Free tier: 20 messages/day per Telegram user (resets midnight UTC).
Users can bypass with their own API key:

    /apikey set <openrouter-key>       unlimited via OpenRouter
    /apikey set <key> <model>          specific model
    /apikey ollama <url> <model>       local Ollama instance
    /apikey remove                     back to platform key
    /apikey status                     check current config

API keys are encrypted at rest (AES-256-GCM) in Supabase.

---

## Running Locally

Prerequisites:
- Node 18+
- Supabase project with pgvector enabled
- OpenRouter API key

Setup:
    git clone <repo>
    cd course-assistant
    npm install
    cp .env.example .env
    npx nest build
    pm2 start ecosystem.config.js

Environment Variables:
    SUPABASE_URL=
    SUPABASE_SERVICE_KEY=
    OPENROUTER_API_KEY=
    TELEGRAM_BOT_TOKEN=
    ENCRYPTION_SECRET=
    PORT=3000

---

## API Endpoints

Courses:
    GET    /admin/courses
    POST   /admin/courses
    DELETE /admin/courses/:id
    GET    /admin/courses/departments
    POST   /admin/courses/departments

Ingest:
    POST   /admin/ingest/upload
    GET    /admin/ingest/status/:materialId
    GET    /admin/ingest/course/:courseId
    POST   /admin/ingest/reprocess/:materialId
    DELETE /admin/ingest/:materialId

Chat:
    POST   /chat
    Body:  { courseId, message, mode, history, telegramId? }
    Response: text/event-stream (SSE)

Users:
    POST   /users/ensure
    POST   /users/apikey
    DELETE /users/apikey
    GET    /users/apikey/status?telegramId=

---

## Uploading Course Material

    curl -X POST http://localhost:3000/admin/ingest/upload
      -F "courseId=<course-uuid>"
      -F "fileType=notes"
      -F "file=@/path/to/notes.txt;type=text/plain"

Supported fileType values: syllabus, slides, past_exam, notes, other

---

## Telegram Commands

    /start    welcome + onboarding
    /courses  pick a course
    /mode     switch study mode
    /clear    clear chat history
    /apikey   manage API key
    /help     command reference

---

## PM2 Process Management

    pm2 status                   check running processes
    pm2 logs studybot-api        backend logs
    pm2 logs studybot-telegram   bot logs
    pm2 restart studybot-api     restart after code changes
    pm2 restart all              restart everything

After code changes:
    npx nest build
    pm2 restart studybot-api

---

## Known Issues and Limitations

- Telegram session is in-memory — lost on bot restart (V2: Redis)
- Only text files supported for ingest (V2: PDF, PPTX)
- No web auth — admin endpoints are open (add API key middleware before production)
- Similarity threshold at 0.70 — lower if retrieval misses on vague queries

---

## Roadmap

V2:
- PDF and PPTX ingestion
- Redis session persistence for Telegram
- Admin dashboard (web UI for course management)
- User auth (JWT for web client)

V3:
- Multi-university support
- Crowdsourced question bank
- Analytics — most asked topics per course
- WhatsApp integration

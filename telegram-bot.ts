import { Telegraf, Markup } from 'telegraf';
import { message }          from 'telegraf/filters';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const API       = process.env.STUDYBOT_API ?? 'http://localhost:3000';

if (!BOT_TOKEN) throw new Error('TELEGRAM_BOT_TOKEN is not set');

interface TgSession {
  step:        'idle' | 'picking_course' | 'chatting';
  courseId?:   string;
  courseCode?: string;
  mode:        'study' | 'exam' | 'summary';
  history:     Array<{ role: string; content: string }>;
}

const sessions = new Map<number, TgSession>();

function getSession(userId: number): TgSession {
  if (!sessions.has(userId)) sessions.set(userId, { step: 'idle', mode: 'study', history: [] });
  return sessions.get(userId)!;
}

async function fetchCourses() {
  const res = await fetch(`${API}/admin/courses`);
  return res.json() as Promise<any[]>;
}

async function streamChat(
  courseId: string,
  message: string,
  mode: string,
  history: any[],
  telegramId: number,
): Promise<string> {
  const res = await fetch(`${API}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ courseId, message, mode, history, telegramId }),
  });

  if (res.status === 429) {
    const data: any = await res.json();
    throw new Error(data.error ?? 'Daily limit reached.');
  }

  if (!res.ok || !res.body) throw new Error('API error: ' + res.status);

  const reader  = res.body.getReader() as ReadableStreamDefaultReader<Uint8Array>;
  const decoder = new TextDecoder();
  let full = '', buf = '';

  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n'); buf = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const payload = line.slice(6); if (payload === '[DONE]') break;
      try { const { text } = JSON.parse(payload); if (text) full += text; } catch {}
    }
  }
  return full;
}

async function ensureUser(telegramId: number, firstName?: string) {
  await fetch(`${API}/users/ensure`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ telegramId, displayName: firstName }),
  }).catch(() => {});
}

function formatQuizForTelegram(raw: string): string {
  try {
    const json = raw.split('__QUIZ_START__\n')[1]?.split('\n__QUIZ_END__')[0]?.trim();
    if (!json) return raw;
    const qs: any[] = JSON.parse(json);
    return qs.map((q, i) =>
      `*Q${i + 1}: ${q.question}*\n` + q.options.join('\n') +
      `\n\n✅ Answer: ${q.answer}\n💡 ${q.explain}`
    ).join('\n\n──────────\n\n');
  } catch { return raw; }
}

function toTelegramMd(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '*$1*')
    .replace(/^#{1,3} (.+)$/gm, '*$1*')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .slice(0, 4000);
}

const bot = new Telegraf(BOT_TOKEN);

bot.start(async ctx => {
  await ensureUser(ctx.from.id, ctx.from.first_name);
  const s = getSession(ctx.from.id); s.step = 'idle'; s.history = [];
  await ctx.reply(
    '*Welcome to StudyBot!* 🎓\n\nYour AI study partner — powered by your actual course materials.\n\n/courses — pick a course\n/apikey — use your own API key for unlimited access\n/help — all commands',
    { parse_mode: 'Markdown' }
  );
});

bot.command('courses', async ctx => {
  await ensureUser(ctx.from.id, ctx.from.first_name);
  const session = getSession(ctx.from.id);
  let courseList: any[];
  try { courseList = await fetchCourses(); }
  catch { await ctx.reply('Could not reach the API.'); return; }
  if (!courseList.length) { await ctx.reply('No courses found yet.'); return; }
  session.step = 'picking_course';
  const buttons = courseList.map(c =>
    Markup.button.callback(`${c.code} — ${c.title}`, `course:${c.id}:${c.code}`)
  );
  await ctx.reply('📚 *Choose a course:*', {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard(
      buttons.reduce((rows: any[][], b, i) => {
        if (i % 2 === 0) rows.push([]); rows[rows.length - 1].push(b); return rows;
      }, [])
    ),
  });
});

bot.action(/^course:(.+):(.+)$/, async ctx => {
  const s = getSession(ctx.from.id);
  const [, courseId, code] = ctx.match;
  s.courseId = courseId; s.courseCode = code; s.step = 'chatting'; s.history = [];
  await ctx.editMessageText(`✅ *${code}* selected!\n\nChoose a study mode:`, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.callback('📖 Study (Socratic)', 'mode:study'),
       Markup.button.callback('🎯 Exam Coach', 'mode:exam')],
      [Markup.button.callback('📋 Summary', 'mode:summary')],
    ]),
  });
});

bot.action(/^mode:(study|exam|summary)$/, async ctx => {
  const s = getSession(ctx.from.id);
  const [, mode] = ctx.match as any; s.mode = mode;
  const desc: Record<string, string> = {
    study:   '🧑‍🏫 *Study mode* — I\'ll explain and ask follow-up questions',
    exam:    '🎯 *Exam mode* — predictions + grading',
    summary: '📋 *Summary mode* — screenshot-ready revision notes',
  };
  await ctx.editMessageText(
    `${desc[mode]}\n\nStudying *${s.courseCode}*. Send me a topic or question.`,
    { parse_mode: 'Markdown' }
  );
});

// ── /apikey command ──────────────────────────────────────────────────────────
bot.command('apikey', async ctx => {
  await ensureUser(ctx.from.id, ctx.from.first_name);
  const parts = ctx.message.text.split(' ').slice(1);
  const sub   = parts[0]?.toLowerCase();

  if (!sub || sub === 'help') {
    await ctx.reply(
      '*API Key Commands*\n\n' +
      '`/apikey set <key>` — use your OpenRouter key (unlimited)\n' +
      '`/apikey set <key> <model>` — use a specific model\n' +
      '`/apikey ollama <url> <model>` — use local Ollama\n' +
      '`/apikey remove` — go back to platform key (20 msg/day)\n' +
      '`/apikey status` — check current config\n\n' +
      'Get a free OpenRouter key at openrouter.ai',
      { parse_mode: 'Markdown' }
    );
    return;
  }

  if (sub === 'set') {
    const key   = parts[1];
    const model = parts[2];
    if (!key) { await ctx.reply('Usage: /apikey set <your-key>'); return; }
    try {
      await fetch(`${API}/users/apikey`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId: ctx.from.id, apiKey: key, model }),
      });
      await ctx.reply(`✅ API key saved${model ? ` with model: ${model}` : ''}.\n\nYou now have unlimited messages. Your key is stored encrypted.`);
    } catch {
      await ctx.reply('Failed to save key. Try again.');
    }
    return;
  }

  if (sub === 'ollama') {
    const url   = parts[1];
    const model = parts[2];
    if (!url || !model) { await ctx.reply('Usage: /apikey ollama <url> <model>\nExample: /apikey ollama http://192.168.0.10:11434/v1 llama3.2'); return; }
    try {
      await fetch(`${API}/users/apikey`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId: ctx.from.id, apiKey: 'ollama', baseUrl: url, model }),
      });
      await ctx.reply(`✅ Ollama configured.\nURL: ${url}\nModel: ${model}\n\nUnlimited local inference active.`);
    } catch {
      await ctx.reply('Failed to save config.');
    }
    return;
  }

  if (sub === 'remove') {
    await fetch(`${API}/users/apikey`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telegramId: ctx.from.id }),
    });
    await ctx.reply('🗑️ API key removed. Back to platform key (20 messages/day).');
    return;
  }

  if (sub === 'status') {
    const res  = await fetch(`${API}/users/apikey/status?telegramId=${ctx.from.id}`);
    const data: any = await res.json();
    if (data.hasKey) {
      await ctx.reply(`✅ Using your own API key\nModel: ${data.model}\nBase URL: ${data.baseUrl}`);
    } else {
      await ctx.reply(`Using platform key\nMessages today: ${data.messagesUsed}/${data.dailyLimit}\nResets: ${data.resetAt}`);
    }
    return;
  }

  await ctx.reply('Unknown subcommand. Try /apikey help');
});

bot.command('mode', async ctx => {
  const s = getSession(ctx.from.id);
  if (!s.courseId) { await ctx.reply('Pick a course first with /courses'); return; }
  await ctx.reply('Switch mode:', Markup.inlineKeyboard([[
    Markup.button.callback('📖 Study', 'mode:study'),
    Markup.button.callback('🎯 Exam',  'mode:exam'),
    Markup.button.callback('📋 Summary', 'mode:summary'),
  ]]));
});

bot.command('clear', async ctx => {
  getSession(ctx.from.id).history = [];
  await ctx.reply('🗑️ History cleared.');
});

bot.command('help', async ctx => {
  await ctx.reply(
    '*StudyBot Commands*\n\n' +
    '/courses — pick a course\n' +
    '/mode — switch study mode\n' +
    '/clear — clear chat history\n' +
    '/apikey — manage your API key\n' +
    '/help — this message\n\n' +
    '*Study tips*\n' +
    '• "quiz me on [topic]" → MCQ practice\n' +
    '• "summarise [topic]" → revision notes\n' +
    '• In exam mode, attempt predictions to get graded\n\n' +
    '*Free tier:* 20 messages/day\n' +
    '*Unlimited:* /apikey set <your-openrouter-key>',
    { parse_mode: 'Markdown' }
  );
});

bot.on(message('text'), async ctx => {
  const s = getSession(ctx.from.id);
  if (!s.courseId || s.step !== 'chatting') {
    await ctx.reply('Pick a course first with /courses'); return;
  }
  await ctx.sendChatAction('typing');
  let reply: string;
  try {
    const raw = await streamChat(s.courseId, ctx.message.text, s.mode, s.history.slice(-10), ctx.from.id);
    reply = raw.includes('__QUIZ_START__') ? formatQuizForTelegram(raw) : toTelegramMd(raw);
    s.history.push({ role: 'user',      content: ctx.message.text });
    s.history.push({ role: 'assistant', content: raw });
  } catch (err: any) {
    reply = `⚠️ ${err.message}`;
  }
  await ctx.reply(reply, { parse_mode: 'Markdown' });
});

bot.launch();
console.log('StudyBot running…');
process.once('SIGINT',  () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

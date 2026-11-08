/*
 * "What do you want to achieve?" search.
 * Claude reads the whole curated catalog (cached prompt prefix) and answers with structured JSON:
 * ranked models plus optional multi-model pipelines. The server then checks every id and every
 * pipeline hand-off against the catalog, so made-up models or broken chains never reach the page.
 */
import Anthropic from '@anthropic-ai/sdk';
import { AI_MODEL, AI_EFFORT, AI_PROVIDER, OPENROUTER_KEY, SITE_URL } from './config.js';

export const MAX_QUERY = 600;

const SYSTEM = `You are Waitro, an index that helps people find the right AI model for what they want to achieve.
You get the full curated catalog below. Recommend ONLY models from it, by their exact id.

How to answer:
- Work out what the person actually needs: the task, the input and output, and any constraints
  (their hardware such as a Mac or a GPU size, budget, licence or commercial use, local vs API, privacy, languages, speed vs quality).
- Recommend 1 to 5 models, best fit first. verdict "best" for the top fit, "good" for solid options, "alternative" for
  options that trade something off (cheaper, runs locally, better licence). Say why in one or two plain sentences,
  and put trade-offs in caveats. Respect hard constraints: never recommend an NVIDIA-only model as the answer for a Mac user,
  or a non-commercial model for commercial use, without saying so clearly in caveats.
- If one model can't do the whole job, add a pipeline: an ordered chain of catalog models where each step's output type
  can take its input from the original input or from an earlier step's output (see io=in->out). Example: speech-to-text
  then an LLM summary then text-to-speech.
  Only add pipelines that are genuinely needed; most single-task requests need none.
- If a model has supersededBy, prefer the newer option unless the constraints favour the older one.
- Curated top picks are editorial; use them as a tie-breaker, not as a rule.
- If the catalog has nothing suitable, return no recommendations and explain the gap in "gaps".
- Never invent facts that aren't in the catalog. Write in the language of the request. Be concise and concrete.`;

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['understanding', 'constraints', 'recommendations', 'pipelines', 'gaps'],
  properties: {
    understanding: { type: 'string', description: 'One sentence restating what the person wants to achieve.' },
    constraints: { type: 'array', items: { type: 'string' }, description: 'Short labels for detected requirements, e.g. "Runs on a Mac".' },
    recommendations: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'verdict', 'why', 'caveats'],
        properties: {
          id: { type: 'string' },
          verdict: { type: 'string', enum: ['best', 'good', 'alternative'] },
          why: { type: 'string' },
          caveats: { type: 'string' },
        },
      },
    },
    pipelines: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'why', 'steps'],
        properties: {
          title: { type: 'string' },
          why: { type: 'string' },
          steps: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['id', 'does'],
              properties: { id: { type: 'string' }, does: { type: 'string' } },
            },
          },
        },
      },
    },
    gaps: { type: 'string', description: 'What the catalog cannot cover for this request, or an empty string.' },
  },
};

let client;
const getClient = () => (client ??= new Anthropic());

/** Calls the configured provider. Kept separate so tests can swap it out. */
export function askClaude(catalog, query) {
  return AI_PROVIDER === 'openrouter' ? askOpenRouter(catalog, query) : askAnthropic(catalog, query);
}

/** OpenRouter's OpenAI-style chat API, with Claude's prompt cache on the catalog block. */
async function askOpenRouter(catalog, query) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${OPENROUTER_KEY}`,
      'content-type': 'application/json',
      'http-referer': SITE_URL,
      'x-title': 'Waitro',
    },
    body: JSON.stringify({
      model: AI_MODEL,
      max_tokens: 16000,
      reasoning: { effort: AI_EFFORT },
      response_format: { type: 'json_schema', json_schema: { name: 'waitro_answer', strict: true, schema: SCHEMA } },
      messages: [
        { role: 'system', content: [
          { type: 'text', text: SYSTEM },
          { type: 'text', text: catalog.digest, cache_control: { type: 'ephemeral', ttl: '1h' } },
        ] },
        { role: 'user', content: query },
      ],
    }),
    signal: AbortSignal.timeout(120_000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    const err = new Error(data.error?.message || `OpenRouter returned ${res.status}`);
    err.status = data.error?.code || res.status;
    throw err;
  }
  const choice = data.choices?.[0];
  if (!choice) throw new Error('OpenRouter returned no answer');
  if (choice.finish_reason === 'content_filter' || choice.message?.refusal) return { refused: true };
  if (choice.finish_reason === 'length') throw new Error('AI answer was cut off');
  return { answer: JSON.parse(choice.message.content), usage: data.usage };
}

async function askAnthropic(catalog, query) {
  const response = await getClient().beta.messages.create({
    model: AI_MODEL,
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: AI_EFFORT, format: { type: 'json_schema', schema: SCHEMA } },
    system: [
      { type: 'text', text: SYSTEM },
      { type: 'text', text: catalog.digest, cache_control: { type: 'ephemeral', ttl: '1h' } },
    ],
    messages: [{ role: 'user', content: query }],
  });
  if (response.stop_reason === 'refusal') {
    return { refused: true };
  }
  if (response.stop_reason === 'max_tokens') throw new Error('AI answer was cut off');
  const text = response.content.filter(b => b.type === 'text').map(b => b.text).join('');
  return { answer: JSON.parse(text), usage: response.usage };
}

const clip = (s, n) => (typeof s === 'string' ? s.slice(0, n) : '');

/** Drops unknown ids and flags pipeline steps whose types don't connect. */
export function sanitizeAnswer(catalog, answer) {
  const seen = new Set();
  const recommendations = [];
  for (const r of answer.recommendations || []) {
    if (!catalog.byId.has(r.id) || seen.has(r.id)) continue;
    seen.add(r.id);
    recommendations.push({ id: r.id, verdict: ['best', 'good', 'alternative'].includes(r.verdict) ? r.verdict : 'good', why: clip(r.why, 600), caveats: clip(r.caveats, 400) });
    if (recommendations.length === 6) break;
  }
  const pipelines = [];
  for (const p of answer.pipelines || []) {
    const steps = (p.steps || []).filter(s => catalog.byId.has(s.id)).slice(0, 6).map(s => ({ id: s.id, does: clip(s.does, 200) }));
    if (steps.length < 2) continue;
    // A step may use the previous step's output, an earlier step's output or the original input
    // (e.g. transcription needs the original audio plus the speaker turns from diarization).
    let connected = true;
    const available = new Set(catalog.byId.get(steps[0].id).io.in);
    for (let i = 1; i < steps.length; i++) {
      for (const t of catalog.byId.get(steps[i - 1].id).io.out) available.add(t);
      const prevOut = catalog.byId.get(steps[i - 1].id).io.out;
      const inp = catalog.byId.get(steps[i].id).io.in;
      const direct = prevOut.filter(x => inp.includes(x));
      steps[i].handoff = direct.length ? direct : inp.filter(x => available.has(x));
      steps[i].fromEarlier = !direct.length && steps[i].handoff.length > 0;
      if (!steps[i].handoff.length) connected = false;
    }
    pipelines.push({ title: clip(p.title, 120), why: clip(p.why, 500), steps, connected });
    if (pipelines.length === 3) break;
  }
  return {
    understanding: clip(answer.understanding, 400),
    constraints: (answer.constraints || []).map(c => clip(c, 60)).filter(Boolean).slice(0, 8),
    recommendations,
    pipelines,
    gaps: clip(answer.gaps, 500),
  };
}

export function keywordAnswer(catalog, query, note) {
  return {
    mode: 'keyword',
    note,
    understanding: '',
    constraints: [],
    recommendations: catalog.keywordSearch(query, 8).map(id => ({ id, verdict: 'match', why: catalog.byId.get(id).summary, caveats: '' })),
    pipelines: [],
    gaps: '',
  };
}

/*
 * Search logic that runs entirely in the browser (and in Node for tests, so: no imports, erasable types only).
 * The AI reads the whole catalog digest and answers with structured JSON; sanitizeAnswer then checks every id and
 * every pipeline hand-off against the catalog, so made-up models or broken chains never reach the page.
 */

export const MAX_QUERY = 600;
export const DEFAULT_MODEL = '~deepseek/deepseek-flash-latest';

export const SYSTEM = `You are Waitro, an index that helps people find the right AI model for what they want to achieve.
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

export const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['understanding', 'constraints', 'recommendations', 'pipelines', 'gaps'],
  properties: {
    understanding: { type: 'string', description: 'One sentence restating what the person wants to achieve.' },
    constraints: { type: 'array', items: { type: 'string' }, description: 'Short labels for detected requirements, e.g. "Runs on a Mac".' },
    recommendations: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false, required: ['id', 'verdict', 'why', 'caveats'],
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
        type: 'object', additionalProperties: false, required: ['title', 'why', 'steps'],
        properties: {
          title: { type: 'string' },
          why: { type: 'string' },
          steps: {
            type: 'array',
            items: { type: 'object', additionalProperties: false, required: ['id', 'does'], properties: { id: { type: 'string' }, does: { type: 'string' } } },
          },
        },
      },
    },
    gaps: { type: 'string', description: 'What the catalog cannot cover for this request, or an empty string.' },
  },
};

export interface CoreModel {
  id: string;
  name: string;
  org: string;
  summary: string;
  tasks: string[];
  tags: string[];
  io: { in: string[]; out: string[] };
  license: { id: string };
  platforms: string[];
}

export interface CoreAnswer {
  understanding: string;
  constraints: string[];
  recommendations: { id: string; verdict: 'best' | 'good' | 'alternative' | 'match'; why: string; caveats: string }[];
  pipelines: { title: string; why: string; steps: { id: string; does: string; handoff?: string[]; fromEarlier?: boolean }[]; connected: boolean }[];
  gaps: string;
}

const clip = (s: unknown, n: number) => (typeof s === 'string' ? s.slice(0, n) : '');

/** Drops unknown ids and flags pipeline steps whose types don't connect. */
export function sanitizeAnswer(byId: Map<string, CoreModel>, answer: any): CoreAnswer {
  const seen = new Set<string>();
  const recommendations: CoreAnswer['recommendations'] = [];
  for (const r of answer?.recommendations || []) {
    if (!byId.has(r.id) || seen.has(r.id)) continue;
    seen.add(r.id);
    recommendations.push({ id: r.id, verdict: ['best', 'good', 'alternative'].includes(r.verdict) ? r.verdict : 'good', why: clip(r.why, 600), caveats: clip(r.caveats, 400) });
    if (recommendations.length === 6) break;
  }
  const pipelines: CoreAnswer['pipelines'] = [];
  for (const p of answer?.pipelines || []) {
    const steps = (p.steps || []).filter((s: any) => byId.has(s.id)).slice(0, 6).map((s: any) => ({ id: s.id as string, does: clip(s.does, 200) })) as CoreAnswer['pipelines'][number]['steps'];
    if (steps.length < 2) continue;
    // A step may use the previous step's output, an earlier step's output or the original input.
    let connected = true;
    const available = new Set(byId.get(steps[0].id)!.io.in);
    for (let i = 1; i < steps.length; i++) {
      for (const t of byId.get(steps[i - 1].id)!.io.out) available.add(t);
      const prevOut = byId.get(steps[i - 1].id)!.io.out;
      const inp = byId.get(steps[i].id)!.io.in;
      const direct = prevOut.filter(x => inp.includes(x));
      steps[i].handoff = direct.length ? direct : inp.filter(x => available.has(x));
      steps[i].fromEarlier = !direct.length && steps[i].handoff!.length > 0;
      if (!steps[i].handoff!.length) connected = false;
    }
    pipelines.push({ title: clip(p.title, 120), why: clip(p.why, 500), steps, connected });
    if (pipelines.length === 3) break;
  }
  return {
    understanding: clip(answer?.understanding, 400),
    constraints: (answer?.constraints || []).map((c: unknown) => clip(c, 60)).filter(Boolean).slice(0, 8),
    recommendations,
    pipelines,
    gaps: clip(answer?.gaps, 500),
  };
}

/** Simple keyword ranking over name, tasks, tags and summary (used without a key or as a fallback). */
export function keywordSearch(models: CoreModel[], taskNames: Map<string, string>, query: string, limit = 8): string[] {
  const terms = (query.toLowerCase().match(/[\p{L}\p{N}]{2,}/gu) || []).filter(t => !STOP.has(t)).slice(0, 12);
  if (!terms.length) return [];
  const scored = models.map(m => {
    const name = `${m.name} ${m.id.replaceAll('-', ' ')}`.toLowerCase();
    const tasks = m.tasks.map(t => `${t.replaceAll('-', ' ')} ${taskNames.get(t) || ''}`).join(' ').toLowerCase();
    const rest = `${m.org} ${m.summary} ${m.tags.join(' ')} ${m.io.in.join(' ')} ${m.io.out.join(' ')} ${m.platforms.join(' ')} ${m.license.id}`.toLowerCase();
    let score = 0;
    let covered = 0;
    let inTask = 0;
    for (const t of terms) {
      const stem = t.length > 5 ? t.slice(0, t.length - 2) : t;
      const hit = [name.includes(stem), tasks.includes(stem), rest.includes(stem)];
      if (hit[0]) score += 4;
      if (hit[1]) { score += 4; inTask++; }
      if (hit[2]) score += 1;
      if (hit.some(Boolean)) covered++;
    }
    // Models that match every term (especially through their task) beat models that match one term loudly.
    score += covered * covered * 3 + (inTask === terms.length ? 6 : 0);
    return { id: m.id, score: covered ? score : 0 };
  });
  return scored.filter(s => s.score > 0).sort((a, b) => b.score - a.score).slice(0, limit).map(s => s.id);
}

const STOP = new Set(['the', 'and', 'for', 'with', 'from', 'that', 'this', 'want', 'need', 'can', 'into', 'my', 'our', 'on', 'of', 'to', 'in', 'a', 'an', 'is', 'it', 'me', 'i', 'we', 'how', 'what', 'which', 'best', 'model', 'models', 'ai']);

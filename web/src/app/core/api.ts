import { Injectable, computed, inject, signal } from '@angular/core';
import { UserKey } from './key';
import { DEFAULT_MODEL, MAX_QUERY, SCHEMA, SYSTEM, keywordSearch, sanitizeAnswer } from './search-core';
import { AgentDetail, AgentSummary, Meta, ModelDetail, ModelSummary, ProviderDetail, ProviderSummary, Ranking, SearchResult, TaskPage } from './types';

interface RankingFile { task: string; name: string; updated: string; picks: { id: string; rank?: number; label: string; why?: string }[] }

const CACHE_PREFIX = 'waitro-answer:';
const CACHE_DAYS = 7;
const CACHE_MAX = 60;

/**
 * Everything is static: the catalog is pre-built JSON next to the app (data/), and AI search calls OpenRouter
 * straight from the browser with the visitor's own key. No Waitro server is involved.
 */
@Injectable({ providedIn: 'root' })
export class Api {
  private readonly userKey = inject(UserKey);
  readonly meta = signal<Meta | null>(null);
  readonly models = signal<ModelSummary[] | null>(null);
  readonly rankings = signal<Record<string, RankingFile>>({});
  readonly modelById = computed(() => new Map((this.models() ?? []).map(m => [m.id, m])));
  readonly taskNames = computed(() => new Map((this.meta()?.domains ?? []).flatMap(d => d.tasks.map(t => [t.id, t.name] as const))));
  readonly taskDomain = computed(() => new Map((this.meta()?.domains ?? []).flatMap(d => d.tasks.map(t => [t.id, d.id] as const))));
  private digest?: Promise<string>;
  private agentList?: Promise<AgentSummary[]>;
  private providerList?: Promise<ProviderSummary[]>;

  agents(): Promise<AgentSummary[]> {
    return (this.agentList ??= this.get<AgentSummary[]>('data/agents.json'));
  }
  providers(): Promise<ProviderSummary[]> {
    return (this.providerList ??= this.get<ProviderSummary[]>('data/providers.json'));
  }
  agent(id: string) {
    return this.get<AgentDetail>(`data/a/${encodeURIComponent(id)}.json`);
  }
  provider(id: string) {
    return this.get<ProviderDetail>(`data/p/${encodeURIComponent(id)}.json`);
  }

  async init(): Promise<void> {
    const [meta, models, rankings] = await Promise.all([
      this.get<Meta>('data/meta.json'), this.get<ModelSummary[]>('data/models.json'), this.get<Record<string, RankingFile>>('data/rankings.json'),
    ]);
    this.meta.set(meta);
    this.models.set(models);
    this.rankings.set(rankings);
  }

  loadModels(): Promise<ModelSummary[]> {
    return Promise.resolve(this.models() ?? []);
  }

  model(id: string) {
    return this.get<ModelDetail>(`data/m/${encodeURIComponent(id)}.json`);
  }

  async task(id: string): Promise<TaskPage> {
    const meta = this.meta()!;
    const t = meta.domains.flatMap(d => d.tasks.map(x => ({ ...x, domain: d.id }))).find(x => x.id === id);
    if (!t) throw Object.assign(new Error('Unknown task'), { status: 404 });
    return { id: t.id, name: t.name, domain: t.domain, ranking: this.rankings()[id] ?? null, models: (this.models() ?? []).filter(m => m.tasks.includes(id)) };
  }

  taskName(id: string) {
    return this.taskNames().get(id) ?? id;
  }

  // ---------- search ----------

  async search(q: string): Promise<SearchResult> {
    q = q.trim();
    if (q.length < 3) throw new Error('Tell us a bit more about what you want to do.');
    if (q.length > MAX_QUERY) throw new Error(`Please keep it under ${MAX_QUERY} characters.`);
    const key = this.userKey.key();
    if (!key) return { ...this.keyword(q, 'Add your own OpenRouter key to use AI search. Until then, these are keyword matches.'), needKey: true };

    const cacheKey = CACHE_PREFIX + await sha256(`${this.meta()!.catalogHash}\n${DEFAULT_MODEL}\n${q.toLowerCase().replace(/\s+/g, ' ')}`);
    const cached = readCache(cacheKey);
    if (cached) return { ...cached, cached: true };

    // Smaller models occasionally return an empty answer; try once more before giving up.
    for (let attempt = 1; attempt <= 2; attempt++) {
      let raw: unknown;
      try {
        raw = await this.askOpenRouter(q, key);
      } catch (e) {
        const status = (e as { status?: number }).status;
        if (status === 401 || status === 403) return { ...this.keyword(q, 'OpenRouter rejected your key. These are keyword matches.'), needKey: true, keyError: true };
        if (status === 402) return { ...this.keyword(q, 'Your OpenRouter key has no credit left. These are keyword matches.'), needKey: true, keyError: true };
        if (attempt === 2) return this.keyword(q, 'AI search is unavailable right now, so these are keyword matches.');
        continue;
      }
      if (raw === 'refused') return this.keyword(q, 'The AI declined this request, so these are keyword matches.');
      const answer = sanitizeAnswer(this.modelById() as never, raw);
      if (answer.recommendations.length || answer.gaps) {
        const result: SearchResult = { mode: 'ai', ...answer };
        writeCache(cacheKey, result);
        return result;
      }
    }
    return this.keyword(q, 'AI search couldn’t answer this right now, so these are keyword matches.');
  }

  /** Checks a key with OpenRouter directly and returns its remaining credit. */
  async checkKey(key: string): Promise<{ remaining: number | null; limit: number | null }> {
    const res = await fetch('https://openrouter.ai/api/v1/key', { headers: { authorization: `Bearer ${key}` } }).catch(() => null);
    if (!res) throw new Error('Couldn’t reach OpenRouter. Check your connection.');
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.data) throw new Error(res.status === 401 ? 'OpenRouter rejected this key.' : 'Couldn’t check the key with OpenRouter right now.');
    return { remaining: data.data.limit_remaining ?? null, limit: data.data.limit ?? null };
  }

  private keyword(q: string, note: string): SearchResult {
    const ids = keywordSearch(this.models() as never, this.taskNames(), q);
    const byId = this.modelById();
    return {
      mode: 'keyword', note, understanding: '', constraints: [], pipelines: [], gaps: '',
      recommendations: ids.map(id => ({ id, verdict: 'match' as const, why: byId.get(id)!.summary, caveats: '' })),
    };
  }

  private async askOpenRouter(q: string, key: string): Promise<unknown> {
    this.digest ??= fetch('data/digest.txt').then(r => r.text());
    const digest = await this.digest;
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json', 'x-title': 'Waitro', 'http-referer': location.origin },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        max_tokens: 16000,
        reasoning: { effort: 'low' },
        response_format: { type: 'json_schema', json_schema: { name: 'waitro_answer', strict: true, schema: SCHEMA } },
        messages: [
          { role: 'system', content: [{ type: 'text', text: SYSTEM }, { type: 'text', text: digest, cache_control: { type: 'ephemeral', ttl: '1h' } }] },
          { role: 'user', content: q },
        ],
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.error) throw Object.assign(new Error(data.error?.message || `OpenRouter returned ${res.status}`), { status: data.error?.code || res.status });
    const choice = data.choices?.[0];
    if (!choice) throw new Error('No answer');
    if (choice.finish_reason === 'content_filter' || choice.message?.refusal) return 'refused';
    return JSON.parse(choice.message.content);
  }

  private async get<T>(url: string): Promise<T> {
    const res = await fetch(url).catch(() => null);
    if (!res || !res.ok) throw Object.assign(new Error(res?.status === 404 ? 'Not found' : 'Something went wrong. Please try again.'), { status: res?.status ?? 0 });
    return res.json();
  }
}

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

function readCache(key: string): SearchResult | null {
  try {
    const v = JSON.parse(localStorage.getItem(key) || 'null');
    if (!v || Date.now() - v.at > CACHE_DAYS * 86400_000) return null;
    return v.result;
  } catch {
    return null;
  }
}

function writeCache(key: string, result: SearchResult) {
  try {
    localStorage.setItem(key, JSON.stringify({ at: Date.now(), result }));
    const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX));
    if (keys.length > CACHE_MAX) {
      keys.map(k => ({ k, at: JSON.parse(localStorage.getItem(k) || '{}').at || 0 })).sort((a, b) => a.at - b.at)
        .slice(0, keys.length - CACHE_MAX).forEach(x => localStorage.removeItem(x.k));
    }
  } catch { /* storage full or blocked: skip caching */ }
}

export type { Ranking };

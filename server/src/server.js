/*
 * One server for everything: /api/* answers from the catalog, everything else is the web app (web/).
 */
import { createServer } from 'node:http';
import { readFileSync, readdirSync, mkdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import {
  PORT, CATALOG_DIR, WEB_DIR, DATA_DIR, REPO_URL, VERSION,
  AI_ENABLED, AI_PROVIDER, AI_MODEL, AI_PER_IP_PER_HOUR, AI_PER_DAY, CACHE_DAYS,
} from './config.js';
import { loadCatalog } from './catalog.js';
import { askClaude, sanitizeAnswer, keywordAnswer, MAX_QUERY } from './search.js';

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

// ---------- search cache and limits ----------

function openStore(dir) {
  mkdirSync(dir, { recursive: true });
  const db = new DatabaseSync(path.join(dir, 'waitro.db'));
  db.exec(`PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS search_cache (key TEXT PRIMARY KEY, created INTEGER NOT NULL, result TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS ai_calls (day TEXT PRIMARY KEY, count INTEGER NOT NULL)`);
  return db;
}

const normalize = q => q.trim().replace(/\s+/g, ' ').toLowerCase();

export function createApp({ catalog, store, ask = askClaude, aiEnabled = AI_ENABLED, now = () => Date.now() }) {
  const hits = new Map(); // ip -> timestamps of AI calls in the last hour

  function allowAi(ip) {
    const t = now();
    const recent = (hits.get(ip) || []).filter(x => t - x < 3600_000);
    if (recent.length >= AI_PER_IP_PER_HOUR) return false;
    const day = new Date(t).toISOString().slice(0, 10);
    const row = store.prepare('SELECT count FROM ai_calls WHERE day = ?').get(day);
    if ((row?.count || 0) >= AI_PER_DAY) return false;
    recent.push(t);
    hits.set(ip, recent);
    store.prepare('INSERT INTO ai_calls (day, count) VALUES (?, 1) ON CONFLICT(day) DO UPDATE SET count = count + 1').run(day);
    return true;
  }

  async function search(ctx) {
    const q = typeof ctx.body.q === 'string' ? ctx.body.q.trim() : '';
    if (q.length < 3) throw new HttpError(400, 'Tell us a bit more about what you want to do.');
    if (q.length > MAX_QUERY) throw new HttpError(400, `Please keep it under ${MAX_QUERY} characters.`);
    if (!aiEnabled) return keywordAnswer(catalog, q, 'AI search is not configured on this server, so these are keyword matches.');

    const key = createHash('sha256').update(`${catalog.hash}\n${AI_MODEL}\n${normalize(q)}`).digest('hex');
    const cached = store.prepare('SELECT created, result FROM search_cache WHERE key = ?').get(key);
    if (cached && now() - cached.created < CACHE_DAYS * 86400_000) return { ...JSON.parse(cached.result), cached: true };
    if (!allowAi(ctx.ip)) return keywordAnswer(catalog, q, 'You reached the AI search limit for now, so these are keyword matches. Try again in a while.');

    let res;
    try {
      res = await ask(catalog, q);
    } catch (e) {
      console.error('AI search failed:', e.status || '', e.message);
      return keywordAnswer(catalog, q, 'AI search is unavailable right now, so these are keyword matches.');
    }
    if (res.refused) return keywordAnswer(catalog, q, 'The AI declined this request, so these are keyword matches.');
    const u = res.usage || {};
    console.log(`AI search: ${u.prompt_tokens ?? u.input_tokens ?? '?'} in (${u.prompt_tokens_details?.cached_tokens ?? u.cache_read_input_tokens ?? 0} cached), ${u.completion_tokens ?? u.output_tokens ?? '?'} out${u.cost != null ? `, $${u.cost.toFixed(4)}` : ''}`);
    const result = { mode: 'ai', ...sanitizeAnswer(catalog, res.answer) };
    store.prepare('INSERT OR REPLACE INTO search_cache (key, created, result) VALUES (?, ?, ?)').run(key, now(), JSON.stringify(result));
    return result;
  }

  const listFields = m => ({
    id: m.id, name: m.name, org: m.org, released: m.released || null, summary: m.summary, tasks: m.tasks, domains: m.domains,
    architecture: m.architecture || null, access: m.access, license: m.license, io: m.io, params: m.params || null,
    contextTokens: m.contextTokens || null, pricing: m.pricing || null, platforms: m.hardware?.platforms || [],
    minVramGB: m.hardware?.minVramGB || null, rankings: m.rankings, hasBetter: Boolean(m.betterOptions?.length),
    better: (m.betterOptions || []).map(o => ({ id: o.id, aspects: o.aspects || [] })),
    stats: m.stats, tags: m.tags || [],
  });

  function detail(ctx) {
    const m = catalog.byId.get(ctx.params.id);
    if (!m) throw new HttpError(404, 'Model not found');
    const brief = id => { const x = catalog.byId.get(id); return { id, name: x.name, summary: x.summary, released: x.released || null, access: x.access }; };
    const topPicks = Object.fromEntries(m.tasks.filter(t => catalog.rankings[t]).map(t => [t, {
      name: catalog.rankings[t].name,
      picks: catalog.rankings[t].picks.filter(p => p.id !== m.id).map(p => ({ ...p, ...brief(p.id) })),
    }]));
    return {
      ...m,
      betterOptions: (m.betterOptions || []).map(o => ({ ...o, ...brief(o.id) })),
      improvesOn: m.improvesOn.map(o => ({ ...o, ...brief(o.id) })),
      topPicks,
      editUrl: `${REPO_URL}/blob/main/data/models/${m.id}.yaml`,
    };
  }

  function task(ctx) {
    const t = catalog.tasks.find(x => x.id === ctx.params.id);
    if (!t) throw new HttpError(404, 'Task not found');
    return { ...t, ranking: catalog.rankings[t.id] || null, models: catalog.models.filter(m => m.tasks.includes(t.id)).map(listFields) };
  }

  const meta = () => ({
    version: VERSION, repo: REPO_URL, ai: aiEnabled, catalogHash: catalog.hash, count: catalog.models.length,
    domains: catalog.taxonomy.domains.map(d => ({ ...d, tasks: d.tasks.map(t => ({ ...t, count: catalog.models.filter(m => m.tasks.includes(t.id)).length, ranked: Boolean(catalog.rankings[t.id]) })) })),
    io: catalog.taxonomy.io, platforms: catalog.taxonomy.platforms, architectures: catalog.taxonomy.architectures,
  });

  const routes = [
    ['GET', /^\/api\/health$/, () => ({ ok: true })],
    ['GET', /^\/api\/meta$/, meta],
    ['GET', /^\/api\/models$/, () => ({ models: catalog.models.map(listFields) })],
    ['GET', /^\/api\/models\/(?<id>[a-z0-9-]{1,80})$/, detail],
    ['GET', /^\/api\/tasks\/(?<id>[a-z0-9-]{1,80})$/, task],
    ['POST', /^\/api\/search$/, search],
  ];

  async function handleApi(req, url) {
    for (const [method, re, fn] of routes) {
      const m = url.pathname.match(re);
      if (!m) continue;
      if (req.method !== method) throw new HttpError(405, 'Method not allowed');
      const body = method === 'POST' ? await readBody(req) : {};
      const ip = req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || '?';
      return fn({ body, params: m.groups || {}, ip, url });
    }
    throw new HttpError(404, 'Not found');
  }

  return { handleApi };
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > 16_384) throw new HttpError(413, 'Request too large');
    chunks.push(c);
  }
  try {
    const v = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
    return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  } catch {
    throw new HttpError(400, 'Invalid JSON');
  }
}

// ---------- static files ----------

const TYPES = { '.woff2': 'font/woff2', '.woff': 'font/woff', '.ico': 'image/x-icon', '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.txt': 'text/plain; charset=utf-8' };

/**
 * Loads web/ into memory. Asset URLs in index.html get a content hash (?v=…), so Cloudflare can cache them forever
 * and a deploy is never served with stale CSS/JS. index.html itself is never cached.
 */
export function loadStatic(dir) {
  const files = new Map();
  const walk = rel => {
    for (const name of readdirSync(path.join(dir, rel))) {
      const r = path.posix.join(rel, name);
      if (statSync(path.join(dir, r)).isDirectory()) walk(r);
      else files.set(`/${r}`, readFileSync(path.join(dir, r)));
    }
  };
  walk('');
  // One hash over all files, so module imports inside JS get busted together with index.html.
  const h = createHash('sha256');
  for (const [p, b] of [...files].sort(([a], [b]) => a.localeCompare(b))) h.update(p).update(b);
  const v = h.digest('hex').slice(0, 10);
  const index = files.get('/index.html').toString('utf8').replace(/(href|src)="\/([^"?#]+)"/g, (all, attr, p) =>
    files.has(`/${p}`) ? `${attr}="/${p}?v=${v}"` : all);
  files.set('/index.html', Buffer.from(index));
  for (const [p, b] of files) {
    if (p.endsWith('.js')) files.set(p, Buffer.from(b.toString('utf8').replace(/(from\s+'\.\/[^'?]+\.js)'/g, `$1?v=${v}'`)));
  }
  const out = new Map();
  for (const [p, body] of files) {
    const type = TYPES[path.extname(p)] || 'application/octet-stream';
    out.set(p, { body, gz: /text|json|svg|javascript/.test(type) ? gzipSync(body) : null, type });
  }
  return out;
}

// Angular emits content-hashed file names (main-AB12CD34.js, media/font-XYZ.woff2).
const HASHED = /-[A-Za-z0-9_]{8}\.(js|css|woff2?)$/;

function sendStatic(req, res, url, files) {
  let file = files.get(url.pathname);
  const isIndex = !file || url.pathname === '/' || url.pathname === '/index.html';
  if (isIndex) {
    // Unknown paths without an extension are app routes; real missing files are 404.
    if (!file && path.extname(url.pathname)) {
      res.writeHead(404, { 'content-type': 'text/plain' }).end('Not found');
      return;
    }
    file = files.get('/index.html');
  }
  const headers = {
    'content-type': file.type,
    'cache-control': isIndex ? 'no-cache' : (url.searchParams.has('v') || HASHED.test(url.pathname) ? 'public, max-age=31536000, immutable' : 'public, max-age=300'),
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'strict-origin-when-cross-origin',
  };
  if (isIndex) headers['content-security-policy'] = "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; font-src 'self'; script-src 'self'; connect-src 'self'; base-uri 'self'; frame-ancestors 'none'";
  const gz = file.gz && /\bgzip\b/.test(req.headers['accept-encoding'] || '');
  if (gz) { headers['content-encoding'] = 'gzip'; headers.vary = 'accept-encoding'; }
  res.writeHead(200, headers).end(req.method === 'HEAD' ? undefined : (gz ? file.gz : file.body));
}

export function startServer({ port = PORT, catalogDir = CATALOG_DIR, webDir = WEB_DIR, dataDir = DATA_DIR, ...opts } = {}) {
  const catalog = loadCatalog(catalogDir);
  const store = openStore(dataDir);
  const app = createApp({ catalog, store, ...opts });
  const files = loadStatic(webDir);

  const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://local');
    if (!url.pathname.startsWith('/api/')) return sendStatic(req, res, url, files);
    try {
      const data = await app.handleApi(req, url);
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }).end(JSON.stringify(data));
    } catch (e) {
      const status = e.status || 500;
      if (status === 500) console.error(e);
      res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
        .end(JSON.stringify({ error: status === 500 ? 'Something went wrong' : e.message }));
    }
  });
  server.listen(port, () => console.log(`Waitro ${VERSION} on :${port} with ${catalog.models.length} models, AI search ${opts.aiEnabled ?? AI_ENABLED ? `on (${AI_PROVIDER}, ${AI_MODEL})` : 'off'}`));
  return server;
}

if (import.meta.url === `file://${process.argv[1]}`) startServer();

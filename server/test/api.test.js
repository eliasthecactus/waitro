import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { loadCatalog, readCatalog } from '../src/catalog.js';
import { validateCatalog } from '../src/validate.js';
import { sanitizeAnswer } from '../src/search.js';
import { createApp, loadStatic } from '../src/server.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const catalog = loadCatalog(path.join(root, 'data'));

function store() {
  const db = new DatabaseSync(':memory:');
  db.exec(`CREATE TABLE search_cache (key TEXT PRIMARY KEY, created INTEGER NOT NULL, result TEXT NOT NULL);
    CREATE TABLE ai_calls (day TEXT PRIMARY KEY, count INTEGER NOT NULL)`);
  return db;
}

const call = (app, method, pathname, body, headers = {}) => {
  const req = (async function* () { if (body) yield Buffer.from(JSON.stringify(body)); })();
  req.method = method;
  req.headers = { 'cf-connecting-ip': '203.0.113.7', ...headers };
  req.socket = {};
  return app.handleApi(req, new URL(`http://x${pathname}`));
};

test('the shipped catalog is valid and cross-linked', () => {
  assert.ok(catalog.models.length >= 40);
  const flash = catalog.byId.get('flashvsr');
  assert.equal(flash.betterOptions[0].id, 'relayvsr');
  assert.ok(catalog.byId.get('relayvsr').improvesOn.some(x => x.id === 'flashvsr'));
  assert.ok(flash.rankings.some(r => r.task === 'video-upscaling' && r.rank === 3));
});

test('validation catches typos and broken references', () => {
  const raw = readCatalog(path.join(root, 'data'));
  const m = raw.models.find(x => x.data.id === 'flashvsr').data;
  m.licence = 'oops';
  m.betterOptions = [{ id: 'does-not-exist', why: 'x' }];
  raw.rankings.find(r => r.data.task === 'coding').data.picks.push({ id: 'kokoro-82m', label: 'wrong task' });
  const errors = validateCatalog(raw).join('\n');
  assert.match(errors, /unknown field "licence"/);
  assert.match(errors, /unknown model "does-not-exist"/);
  assert.match(errors, /"kokoro-82m" is not tagged with task "coding"/);
});

test('keyword search finds models by meaning words', () => {
  assert.ok(catalog.keywordSearch('upscale video').includes('relayvsr'));
  assert.ok(catalog.keywordSearch('transcribe speech').some(id => catalog.byId.get(id).tasks.includes('speech-to-text')));
});

test('AI answers are cleaned: unknown ids dropped, broken chains flagged', () => {
  const out = sanitizeAnswer(catalog, {
    understanding: 'u', constraints: ['Mac'], gaps: '',
    recommendations: [{ id: 'made-up-model', verdict: 'best', why: '', caveats: '' }, { id: 'rife', verdict: 'best', why: 'w', caveats: '' }],
    pipelines: [
      { title: 'ok', why: '', steps: [{ id: 'whisper-large-v3-turbo', does: 'a' }, { id: 'claude-haiku-5-5', does: 'b' }, { id: 'kokoro-82m', does: 'c' }] },
      { title: 'broken', why: '', steps: [{ id: 'kokoro-82m', does: 'a' }, { id: 'rife', does: 'b' }] },
      { title: 'diarize', why: '', steps: [{ id: 'pyannote-community-1', does: 'a' }, { id: 'nemotron-3-5-transcribe', does: 'b' }] },
    ],
  });
  assert.deepEqual(out.recommendations.map(r => r.id), ['rife']);
  assert.equal(out.pipelines[0].connected, true);
  assert.deepEqual(out.pipelines[0].steps[1].handoff, ['text']);
  assert.equal(out.pipelines[1].connected, false);
  assert.equal(out.pipelines[2].connected, true);
  assert.equal(out.pipelines[2].steps[1].fromEarlier, true);
});

test('search uses the AI once, then the cache', async () => {
  let calls = 0;
  const ask = async () => {
    calls++;
    return { answer: { understanding: 'Upscale', constraints: [], gaps: '', pipelines: [], recommendations: [{ id: 'relayvsr', verdict: 'best', why: 'fast', caveats: '' }] } };
  };
  const app = createApp({ catalog, store: store(), ask, aiEnabled: true, keyMode: 'both' });
  const a = await call(app, 'POST', '/api/search', { q: 'Upscale my videos' });
  const b = await call(app, 'POST', '/api/search', { q: '  upscale   my videos ' });
  assert.equal(a.mode, 'ai');
  assert.equal(a.recommendations[0].id, 'relayvsr');
  assert.equal(b.cached, true);
  assert.equal(calls, 1);
});

test('search falls back to keywords without AI, on errors and on refusals', async () => {
  const off = createApp({ catalog, store: store(), aiEnabled: false });
  assert.equal((await call(off, 'POST', '/api/search', { q: 'speech to text' })).mode, 'keyword');
  const failing = createApp({ catalog, store: store(), aiEnabled: true, keyMode: 'both', ask: async () => { throw new Error('down'); } });
  assert.equal((await call(failing, 'POST', '/api/search', { q: 'speech to text' })).mode, 'keyword');
  const refusing = createApp({ catalog, store: store(), aiEnabled: true, keyMode: 'both', ask: async () => ({ refused: true }) });
  assert.equal((await call(refusing, 'POST', '/api/search', { q: 'speech to text' })).mode, 'keyword');
  await assert.rejects(call(off, 'POST', '/api/search', { q: 'x' }), /more about/);
});

test('per-IP AI limit falls back to keyword results', async () => {
  let calls = 0;
  const ask = async () => { calls++; return { answer: { understanding: '', constraints: [], gaps: '', pipelines: [], recommendations: [{ id: 'rife', verdict: 'best', why: '', caveats: '' }] } }; };
  const app = createApp({ catalog, store: store(), ask, aiEnabled: true, keyMode: 'both' });
  let last;
  for (let i = 0; i < 25; i++) last = await call(app, 'POST', '/api/search', { q: `query number ${i}` });
  assert.equal(calls, 20);
  assert.equal(last.mode, 'keyword');
});

test('detail and task endpoints', async () => {
  const app = createApp({ catalog, store: store(), aiEnabled: false });
  const d = await call(app, 'GET', '/api/models/flashvsr');
  assert.equal(d.betterOptions[0].name, 'RelayVSR');
  assert.ok(d.topPicks['video-upscaling'].picks.every(p => p.id !== 'flashvsr'));
  const t = await call(app, 'GET', '/api/tasks/video-upscaling');
  assert.equal(t.ranking.picks[0].id, 'seedvr2');
  await assert.rejects(call(app, 'GET', '/api/models/nope'), /not found/i);
});

test('static assets get a cache-busting version', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'waitro-web-'));
  mkdirSync(path.join(dir, 'js'));
  writeFileSync(path.join(dir, 'index.html'), '<link href="/style.css"><script src="/js/app.js"></script>');
  writeFileSync(path.join(dir, 'style.css'), 'body{}');
  writeFileSync(path.join(dir, 'js/app.js'), "import { x } from './util.js';");
  writeFileSync(path.join(dir, 'js/util.js'), 'export const x = 1;');
  const files = loadStatic(dir);
  assert.match(files.get('/index.html').body.toString(), /\/style\.css\?v=[a-f0-9]{10}/);
  assert.match(files.get('/js/app.js').body.toString(), /from '\.\/util\.js\?v=[a-f0-9]{10}'/);
});

test('an empty AI answer is retried and never cached', async () => {
  let calls = 0;
  const empty = { understanding: 'x', constraints: [], gaps: '', pipelines: [], recommendations: [] };
  const good = { ...empty, recommendations: [{ id: 'rife', verdict: 'best', why: 'w', caveats: '' }] };
  const ask = async () => ({ answer: ++calls === 1 ? empty : good });
  const app = createApp({ catalog, store: store(), ask, aiEnabled: true, keyMode: 'both' });
  const r = await call(app, 'POST', '/api/search', { q: 'smooth video' });
  assert.equal(calls, 2);
  assert.equal(r.recommendations[0].id, 'rife');

  let n = 0;
  const alwaysEmpty = createApp({ catalog, store: store(), aiEnabled: true, keyMode: 'both', ask: async () => { n++; return { answer: empty }; } });
  assert.equal((await call(alwaysEmpty, 'POST', '/api/search', { q: 'smooth video' })).mode, 'keyword');
  await call(alwaysEmpty, 'POST', '/api/search', { q: 'smooth video' });
  assert.equal(n, 4);
});

const USER_KEY = 'sk-or-v1-' + 'a'.repeat(64);

test('user key mode: no key means keyword results and a prompt for a key', async () => {
  let calls = 0;
  const app = createApp({ catalog, store: store(), aiEnabled: false, keyMode: 'user', ask: async () => { calls++; return {}; } });
  const r = await call(app, 'POST', '/api/search', { q: 'upscale my videos' });
  assert.equal(r.mode, 'keyword');
  assert.equal(r.needKey, true);
  assert.equal(calls, 0);
  const meta = await call(app, 'GET', '/api/meta');
  assert.equal(meta.userAi, true);
  assert.equal(meta.serverAi, false);
});

test('a visitor key is passed to the AI call and never stored', async () => {
  let seen;
  const ask = async (_c, _q, opts) => { seen = opts.userKey; return { answer: { understanding: '', constraints: [], gaps: '', pipelines: [], recommendations: [{ id: 'rife', verdict: 'best', why: 'w', caveats: '' }] } }; };
  const db = store();
  const app = createApp({ catalog, store: db, aiEnabled: false, keyMode: 'user', ask });
  const r = await call(app, 'POST', '/api/search', { q: 'smooth video' }, { 'x-openrouter-key': USER_KEY });
  assert.equal(r.mode, 'ai');
  assert.equal(seen, USER_KEY);
  const dump = JSON.stringify(db.prepare('SELECT * FROM search_cache').all());
  assert.ok(!dump.includes(USER_KEY));
});

test('a malformed or rejected visitor key gives a clear message', async () => {
  const app = createApp({ catalog, store: store(), aiEnabled: false, keyMode: 'user', ask: async () => { throw Object.assign(new Error('bad'), { status: 401 }); } });
  await assert.rejects(call(app, 'POST', '/api/search', { q: 'smooth video' }, { 'x-openrouter-key': 'nope' }), /OpenRouter key/);
  const r = await call(app, 'POST', '/api/search', { q: 'smooth video' }, { 'x-openrouter-key': USER_KEY });
  assert.equal(r.keyError, true);
  assert.match(r.note, /rejected/);
});

test('key check reports remaining credit', async () => {
  const app = createApp({ catalog, store: store(), aiEnabled: false, keyMode: 'user', checkKey: async k => ({ ok: k === USER_KEY, remaining: 4.2, limit: 5 }) });
  const r = await call(app, 'POST', '/api/key/check', {}, { 'x-openrouter-key': USER_KEY });
  assert.equal(r.remaining, 4.2);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { loadCatalog, readCatalog } from '../src/catalog.js';
import { validateCatalog } from '../src/validate.js';
// The browser search logic is plain TypeScript; Node 24 loads it directly.
import { sanitizeAnswer, keywordSearch } from '../../web/src/app/core/search-core.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const catalog = loadCatalog(path.join(root, 'data'));
const list = catalog.models.map(m => ({ ...m, platforms: m.hardware?.platforms || [], tags: m.tags || [] }));
const byId = new Map(list.map(m => [m.id, m]));
const taskNames = new Map(catalog.tasks.map(t => [t.id, t.name]));

test('the shipped catalog is valid and cross-linked', () => {
  assert.ok(catalog.models.length >= 400);
  const flash = catalog.byId.get('flashvsr');
  assert.equal(flash.betterOptions[0].id, 'relayvsr');
  assert.ok(catalog.byId.get('relayvsr').improvesOn.some(x => x.id === 'flashvsr'));
  assert.ok(flash.rankings.some(r => r.task === 'video-upscaling' && r.rank === 3));
});

test('validation catches typos, broken references and future dates', () => {
  const raw = readCatalog(path.join(root, 'data'));
  const m = raw.models.find(x => x.data.id === 'flashvsr').data;
  m.licence = 'oops';
  m.betterOptions = [{ id: 'does-not-exist', why: 'x' }];
  m.released = '2999-01-01';
  raw.rankings.find(r => r.data.task === 'coding').data.picks.push({ id: 'kokoro-82m', label: 'wrong task' });
  const errors = validateCatalog(raw).join('\n');
  assert.match(errors, /unknown field "licence"/);
  assert.match(errors, /unknown model "does-not-exist"/);
  assert.match(errors, /"kokoro-82m" is not tagged with task "coding"/);
  assert.match(errors, /"released" is in the future/);
});

test('keyword search ranks matching models', () => {
  assert.ok(keywordSearch(list, taskNames, 'upscale video').includes('relayvsr'));
  assert.ok(keywordSearch(list, taskNames, 'transcribe speech').some(id => byId.get(id).tasks.includes('speech-to-text')));
  assert.deepEqual(keywordSearch(list, taskNames, 'the and for'), []);
});

test('AI answers are cleaned: unknown ids dropped, chains checked', () => {
  const out = sanitizeAnswer(byId, {
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

test('build-data writes the static files the app reads', () => {
  execFileSync('node', [path.join(root, 'tools/src/build-data.mjs'), '--no-stats'], { stdio: 'pipe' });
  const dir = path.join(root, 'web/public/data');
  const meta = JSON.parse(readFileSync(path.join(dir, 'meta.json'), 'utf8'));
  const models = JSON.parse(readFileSync(path.join(dir, 'models.json'), 'utf8'));
  assert.equal(meta.count, models.length);
  assert.equal(meta.catalogHash, catalog.hash);
  const detail = JSON.parse(readFileSync(path.join(dir, 'm/flashvsr.json'), 'utf8'));
  assert.equal(detail.betterOptions[0].name, 'RelayVSR');
  assert.ok(detail.topPicks['video-upscaling'].picks.every(p => p.id !== 'flashvsr'));
  assert.ok(existsSync(path.join(dir, 'digest.txt')));
  assert.equal(meta.agentCount, JSON.parse(readFileSync(path.join(dir, 'agents.json'), 'utf8')).length);
  const go = JSON.parse(readFileSync(path.join(dir, 'p/opencode-go.json'), 'utf8'));
  assert.ok(go.worksWith.some(a => a.id === 'claude-code'));
  const glm = JSON.parse(readFileSync(path.join(dir, 'm/glm-5-3.json'), 'utf8'));
  assert.ok(glm.offeredBy.some(o => o.provider === 'opencode-zen' && o.providerName === 'OpenCode Zen'));
});

test('agents and providers are cross-linked both ways', () => {
  const claude = catalog.agentById.get('claude-code');
  assert.ok(claude.providers.includes('zai-coding-plan'), 'provider.worksWith shows up on the agent');
  assert.deepEqual(claude.wrappedBy, ['t3-code']);
  assert.ok(catalog.providerById.get('openrouter').worksWith.includes('hermes-agent'));
  assert.ok(catalog.byId.get('claude-fable-5-2').usedBy.includes('claude-code'));
});

test('agent and provider files are validated', () => {
  const raw = readCatalog(path.join(root, 'data'));
  const a = raw.agents.find(x => x.data.id === 't3-code').data;
  a.wraps.push('no-such-agent');
  a.surface = ['cli'];
  const p = raw.providers.find(x => x.data.id === 'arnict').data;
  p.models.push({ id: 'no-such-model', name: 'X' });
  p.billing.types = ['barter'];
  const errors = validateCatalog(raw).join('\n');
  assert.match(errors, /t3-code\.yaml: unknown agent "no-such-agent"/);
  assert.match(errors, /unknown field "surface"/);
  assert.match(errors, /arnict\.yaml: unknown model "no-such-model"/);
  assert.match(errors, /"barter" is not one of/);
});

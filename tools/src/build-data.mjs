// Builds the static data the web app reads (web/public/data): model list, one file per model,
// rankings, meta and the AI digest. Fetches fresh GitHub/Hugging Face stats unless --no-stats.
// Usage: node src/build-data.mjs [--no-stats]
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCatalog, readCatalog } from './catalog.js';
import { fetchStats } from './stats.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dataDir = path.join(root, 'data');
const out = path.join(root, 'web/public/data');
const REPO = process.env.REPO_URL || 'https://github.com/eliasthecactus/waitro';

const raw = readCatalog(dataDir);
const stats = process.argv.includes('--no-stats') ? {} : await fetchStats([
  ...raw.models.map(m => m.data),
  ...raw.agents.map(a => ({ ...a.data, id: `agent:${a.data.id}` })),
]);
const catalog = loadCatalog(dataDir, { stats });

const listFields = m => ({
  id: m.id, name: m.name, org: m.org, released: m.released || null, summary: m.summary, tasks: m.tasks, domains: m.domains,
  architecture: m.architecture || null, access: m.access, license: m.license, io: m.io, params: m.params || null,
  contextTokens: m.contextTokens || null, pricing: m.pricing || null, platforms: m.hardware?.platforms || [],
  minVramGB: m.hardware?.minVramGB || null, rankings: m.rankings, hasBetter: Boolean(m.betterOptions?.length),
  better: (m.betterOptions || []).map(o => ({ id: o.id, aspects: o.aspects || [] })),
  stats: m.stats, tags: m.tags || [],
});

const brief = id => {
  const x = catalog.byId.get(id);
  return { id, name: x.name, summary: x.summary, released: x.released || null, access: x.access };
};

function detail(m) {
  const topPicks = Object.fromEntries(m.tasks.filter(t => catalog.rankings[t]).map(t => [t, {
    name: catalog.rankings[t].name,
    picks: catalog.rankings[t].picks.filter(p => p.id !== m.id).map(p => ({ ...p, ...brief(p.id) })),
  }]));
  return {
    ...m,
    betterOptions: (m.betterOptions || []).map(o => ({ ...o, ...brief(o.id) })),
    improvesOn: m.improvesOn.map(o => ({ ...o, ...brief(o.id) })),
    topPicks,
    offeredBy: m.offeredBy.map(o => ({ ...o, providerName: catalog.providerById.get(o.provider).name, providerKind: catalog.providerById.get(o.provider).kind })),
    usedBy: m.usedBy.map(id => agentBrief(id)),
    editUrl: `${REPO}/blob/main/data/models/${m.id}.yaml`,
  };
}

const agentBrief = id => {
  const a = catalog.agentById.get(id);
  return { id, name: a.name, org: a.org, kind: a.kind, summary: a.summary, openSource: a.openSource };
};
const providerBrief = id => {
  const p = catalog.providerById.get(id);
  return { id, name: p.name, org: p.org, kind: p.kind, summary: p.summary, billing: p.billing.types };
};

const agentList = a => ({
  id: a.id, name: a.name, org: a.org, kind: a.kind, summary: a.summary, surfaces: a.surfaces, os: a.os, openSource: a.openSource,
  license: a.license || null, version: a.version || null, pricing: { summary: a.pricing.summary, free: Boolean(a.pricing.free), from: minPrice(a.pricing.plans) },
  providers: a.providers, wraps: a.wraps || [], stats: a.stats, tags: a.tags || [],
});
const providerList = p => ({
  id: p.id, name: p.name, org: p.org, kind: p.kind, summary: p.summary, hq: p.hq || null, billing: p.billing, api: p.api,
  from: minPrice(p.plans), modelCount: p.modelCount ?? (p.models?.length || null), worksWith: p.worksWith, tags: p.tags || [],
});
function minPrice(plans = []) {
  const paid = plans.filter(x => x.price > 0 && x.period !== 'once').sort((a, b) => a.price - b.price)[0];
  return paid ? { price: paid.price, period: paid.period } : null;
}
const agentDetail = a => ({
  ...a,
  providers: a.providers.map(providerBrief),
  wraps: (a.wraps || []).map(agentBrief),
  wrappedBy: a.wrappedBy.map(agentBrief),
  modelIds: undefined,
  models: a.models,
  builtFor: (a.modelIds || []).map(brief),
  editUrl: `${REPO}/blob/main/data/agents/${a.id}.yaml`,
});
const providerDetail = p => ({
  ...p,
  models: (p.models || []).map(m => (m.id ? { ...m, catalogName: catalog.byId.get(m.id).name } : m)),
  worksWith: p.worksWith.map(agentBrief),
  editUrl: `${REPO}/blob/main/data/providers/${p.id}.yaml`,
});

const meta = {
  version: JSON.parse((await import('node:fs')).readFileSync(path.join(root, 'tools/package.json'), 'utf8')).version,
  repo: REPO,
  builtAt: new Date().toISOString(),
  catalogHash: catalog.hash,
  count: catalog.models.length,
  agentCount: catalog.agents.length,
  providerCount: catalog.providers.length,
  domains: catalog.taxonomy.domains.map(d => ({
    ...d,
    tasks: d.tasks.map(t => ({ ...t, domain: d.id, count: catalog.models.filter(m => m.tasks.includes(t.id)).length, ranked: Boolean(catalog.rankings[t.id]) })),
  })),
  io: catalog.taxonomy.io,
  platforms: catalog.taxonomy.platforms,
  architectures: catalog.taxonomy.architectures,
};

rmSync(out, { recursive: true, force: true });
for (const d of ['m', 'a', 'p']) mkdirSync(path.join(out, d), { recursive: true });
const write = (file, data) => writeFileSync(path.join(out, file), typeof data === 'string' ? data : JSON.stringify(data));
write('meta.json', meta);
write('models.json', catalog.models.map(listFields));
write('rankings.json', catalog.rankings);
write('digest.txt', catalog.digest);
for (const m of catalog.models) write(`m/${m.id}.json`, detail(m));
write('agents.json', catalog.agents.map(agentList));
write('providers.json', catalog.providers.map(providerList));
for (const a of catalog.agents) write(`a/${a.id}.json`, agentDetail(a));
for (const p of catalog.providers) write(`p/${p.id}.json`, providerDetail(p));
console.log(`data: ${catalog.models.length} models, ${catalog.agents.length} agents, ${catalog.providers.length} providers, ${Object.keys(catalog.rankings).length} rankings, stats for ${Object.keys(stats).length}, hash ${catalog.hash} -> ${path.relative(root, out)}`);

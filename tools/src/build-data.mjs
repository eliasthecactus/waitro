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

const stats = process.argv.includes('--no-stats') ? {} : await fetchStats(readCatalog(dataDir).models.map(m => m.data));
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
    editUrl: `${REPO}/blob/main/data/models/${m.id}.yaml`,
  };
}

const meta = {
  version: JSON.parse((await import('node:fs')).readFileSync(path.join(root, 'tools/package.json'), 'utf8')).version,
  repo: REPO,
  builtAt: new Date().toISOString(),
  catalogHash: catalog.hash,
  count: catalog.models.length,
  domains: catalog.taxonomy.domains.map(d => ({
    ...d,
    tasks: d.tasks.map(t => ({ ...t, domain: d.id, count: catalog.models.filter(m => m.tasks.includes(t.id)).length, ranked: Boolean(catalog.rankings[t.id]) })),
  })),
  io: catalog.taxonomy.io,
  platforms: catalog.taxonomy.platforms,
  architectures: catalog.taxonomy.architectures,
};

rmSync(out, { recursive: true, force: true });
mkdirSync(path.join(out, 'm'), { recursive: true });
const write = (file, data) => writeFileSync(path.join(out, file), typeof data === 'string' ? data : JSON.stringify(data));
write('meta.json', meta);
write('models.json', catalog.models.map(listFields));
write('rankings.json', catalog.rankings);
write('digest.txt', catalog.digest);
for (const m of catalog.models) write(`m/${m.id}.json`, detail(m));
console.log(`data: ${catalog.models.length} models, ${Object.keys(catalog.rankings).length} rankings, stats for ${Object.keys(stats).length}, hash ${catalog.hash} -> ${path.relative(root, out)}`);

// Refreshes data/stats.json: GitHub stars and Hugging Face downloads (last 30 days) for every model with those links.
// Runs nightly in CI; set GITHUB_TOKEN to avoid the low anonymous rate limit.
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCatalog } from '../server/src/catalog.js';

const data = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../data');
const models = readCatalog(data).models.map(x => x.data);
const gh = { 'user-agent': 'waitro-stats', ...(process.env.GITHUB_TOKEN ? { authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}) };

async function json(url, headers = { 'user-agent': 'waitro-stats' }) {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

const stats = {};
for (const m of models) {
  const s = {};
  const repo = m.links.repo?.match(/^https:\/\/github\.com\/([^/]+\/[^/#?]+)/)?.[1];
  const hf = m.links.weights?.match(/^https:\/\/huggingface\.co\/([^/]+\/[^/#?]+)/)?.[1];
  try {
    if (repo) {
      const r = await json(`https://api.github.com/repos/${repo}`, gh);
      Object.assign(s, { stars: r.stargazers_count, lastCommit: r.pushed_at.slice(0, 10) });
    }
    if (hf) {
      const r = await json(`https://huggingface.co/api/models/${hf}`);
      Object.assign(s, { downloads: r.downloads, likes: r.likes });
    }
  } catch (e) {
    console.warn(`${m.id}: ${e.message}`);
  }
  if (Object.keys(s).length) stats[m.id] = s;
}
writeFileSync(path.join(data, 'stats.json'), `${JSON.stringify(stats, null, 2)}\n`);
console.log(`stats for ${Object.keys(stats).length} of ${models.length} models`);

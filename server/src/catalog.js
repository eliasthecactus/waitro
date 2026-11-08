/*
 * Loads the YAML catalog, validates it and builds what the API needs:
 * enriched model objects, a full-text index and a compact digest for the AI search.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import YAML from 'yaml';
import { validateCatalog, taxonomyInfo } from './validate.js';

const readYaml = file => YAML.parse(readFileSync(file, 'utf8'));

function readDir(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter(f => f.endsWith('.yaml'))
    .sort()
    .map(file => ({ file, data: readYaml(path.join(dir, file)) }));
}

export function readCatalog(dir) {
  return {
    taxonomy: readYaml(path.join(dir, 'taxonomy.yaml')),
    models: readDir(path.join(dir, 'models')),
    rankings: readDir(path.join(dir, 'rankings')),
    stats: existsSync(path.join(dir, 'stats.json')) ? JSON.parse(readFileSync(path.join(dir, 'stats.json'), 'utf8')) : {},
  };
}

export function loadCatalog(dir) {
  const raw = readCatalog(dir);
  const errors = validateCatalog(raw);
  if (errors.length) {
    const err = new Error(`Catalog has ${errors.length} problem(s):\n  ${errors.join('\n  ')}`);
    err.problems = errors;
    throw err;
  }
  return buildCatalog(raw);
}

export function buildCatalog({ taxonomy, models, rankings, stats }) {
  const t = taxonomyInfo(taxonomy);
  const taskById = new Map(t.tasks.map(x => [x.id, x]));
  const list = models.map(({ data }) => structuredClone(data));
  const byId = new Map(list.map(m => [m.id, m]));

  for (const m of list) {
    m.improvesOn = [];
    m.rankings = [];
    m.domains = [...new Set(m.tasks.map(id => taskById.get(id).domain))];
    m.stats = stats[m.id] || null;
  }
  for (const m of list) {
    for (const opt of m.betterOptions || []) byId.get(opt.id).improvesOn.push({ id: m.id, why: opt.why, aspects: opt.aspects || [] });
  }
  const rankingByTask = {};
  for (const { data } of rankings) {
    const picks = [...data.picks].sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));
    rankingByTask[data.task] = { task: data.task, name: taskById.get(data.task).name, updated: data.updated, picks };
    for (const p of picks) {
      byId.get(p.id).rankings.push({ task: data.task, taskName: taskById.get(data.task).name, rank: p.rank ?? null, label: p.label, why: p.why || '', of: picks.length });
    }
  }

  const index = new DatabaseSync(':memory:');
  index.exec(`CREATE VIRTUAL TABLE fts USING fts5(id UNINDEXED, name, body, tokenize = 'porter unicode61')`);
  const insert = index.prepare('INSERT INTO fts (id, name, body) VALUES (?, ?, ?)');
  for (const m of list) {
    const body = [
      m.org, m.summary, m.description, m.tasks.map(id => taskById.get(id).name).join(' '),
      (m.tags || []).join(' '), (m.strengths || []).join(' '), m.hardware?.note, m.license.id,
      m.io.in.join(' '), m.io.out.join(' '), (m.hardware?.platforms || []).join(' '),
    ].filter(Boolean).join(' ');
    insert.run(m.id, `${m.name} ${m.id.replaceAll('-', ' ')}`, body);
  }

  const digest = buildDigest(list, rankingByTask, taskById);
  const hash = createHash('sha256').update(JSON.stringify({ models, rankings })).digest('hex').slice(0, 16);

  return {
    taxonomy,
    tasks: t.tasks,
    models: list,
    byId,
    rankings: rankingByTask,
    digest,
    hash,
    keywordSearch(query, limit = 10) {
      const terms = (query.toLowerCase().match(/[\p{L}\p{N}]{2,}/gu) || []).slice(0, 12);
      if (!terms.length) return [];
      const match = terms.map(w => `"${w}"*`).join(' OR ');
      return index.prepare('SELECT id, bm25(fts, 4.0, 1.0) AS score FROM fts WHERE fts MATCH ? ORDER BY score LIMIT ?')
        .all(match, limit).map(r => r.id);
    },
  };
}

const fmtParams = p => {
  if (!p?.total) return '';
  const b = n => (n >= 1000 ? `${+(n / 1000).toFixed(2)}T` : `${n}B`);
  return p.active ? `${b(p.total)} total/${b(p.active)} active` : b(p.total);
};

function priceText(p) {
  const parts = [];
  if (p.inputPerM !== undefined) parts.push(`$${p.inputPerM}/$${p.outputPerM ?? '?'} per 1M tokens in/out`);
  if (p.perImage !== undefined) parts.push(`$${p.perImage} per image`);
  if (p.perSecond !== undefined) parts.push(`$${p.perSecond} per second`);
  if (p.perMinute !== undefined) parts.push(`$${p.perMinute} per minute`);
  if (p.perMChars !== undefined) parts.push(`$${p.perMChars} per 1M characters`);
  if (p.perMonth !== undefined) parts.push(`$${p.perMonth} per month`);
  if (p.note) parts.push(`(${p.note})`);
  return parts.join(' ');
}

/** One compact line per model, plus the curated top picks. This is the AI's whole view of the catalog. */
function buildDigest(list, rankingByTask, taskById) {
  const lines = list.map(m => [
    `id=${m.id}`,
    `name=${m.name}`,
    `org=${m.org}`,
    `tasks=${m.tasks.join(',')}`,
    `access=${m.access}`,
    `license=${m.license.id} (commercial:${m.license.commercial}${m.license.note ? `; ${m.license.note}` : ''})`,
    `io=${m.io.in.join('+')}->${m.io.out.join('+')}`,
    fmtParams(m.params) && `params=${fmtParams(m.params)}`,
    m.contextTokens && `context=${m.contextTokens}`,
    m.scale && `scale=${m.scale}x`,
    `platforms=${(m.hardware?.platforms || []).join(',') || 'unspecified'}`,
    m.hardware?.minVramGB && `minVRAM=${m.hardware.minVramGB}GB`,
    m.hardware?.note && `hw=${m.hardware.note}`,
    m.pricing && `price=${priceText(m.pricing)}`,
    m.released && `released=${m.released}`,
    `summary=${m.summary}`,
    m.strengths?.length && `strengths=${m.strengths.join('; ')}`,
    m.limitations?.length && `limits=${m.limitations.join('; ')}`,
    m.betterOptions?.length && `supersededBy=${m.betterOptions.map(o => o.id).join(',')}`,
  ].filter(Boolean).join(' | '));
  const picks = Object.values(rankingByTask).map(r =>
    `${r.task}: ${r.picks.map(p => `${p.rank ? `#${p.rank} ` : ''}${p.id} (${p.label})`).join(', ')}`);
  return `MODELS (${list.length})\n${lines.join('\n')}\n\nCURATED TOP PICKS PER TASK\n${picks.join('\n')}\n\nTASKS\n${
    [...taskById.values()].map(t => `${t.id}: ${t.name}`).join('\n')}`;
}

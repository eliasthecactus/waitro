/*
 * Checks model and ranking files. Unknown keys are errors so typos don't slip through review.
 * Returns a list of human-readable problems; empty means valid.
 */

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const URL_RE = /^https:\/\/\S+$/;

const COMMERCIAL = ['yes', 'limited', 'no', 'unknown'];
const DATE_SOURCES = ['vendor', 'paper', 'github', 'huggingface'];
const ASPECTS = ['speed', 'memory', 'quality', 'license', 'cost', 'size', 'modalities', 'languages', 'hardware'];
const LINK_KEYS = ['repo', 'paper', 'weights', 'homepage', 'docs', 'pricing', 'demo'];

const str = { type: 'string' };
const num = { type: 'number' };
const bool = { type: 'boolean' };
const strList = { type: 'array', items: str };
const url = { type: 'string', pattern: URL_RE, hint: 'an https:// URL' };
const date = { type: 'string', pattern: DATE, hint: 'YYYY-MM-DD' };

function modelSchema(t) {
  return {
    type: 'object',
    required: ['id', 'name', 'org', 'summary', 'tasks', 'access', 'license', 'io', 'links', 'lastChecked'],
    props: {
      id: { type: 'string', pattern: ID, hint: 'lowercase-kebab-case' },
      name: str,
      org: str,
      released: date,
      dateSource: { type: 'string', enum: DATE_SOURCES },
      summary: { type: 'string', max: 200 },
      description: str,
      tasks: { type: 'array', items: { type: 'string', enum: t.taskIds }, min: 1 },
      architecture: { type: 'string', enum: t.architectures },
      access: { type: 'string', enum: t.access },
      license: {
        type: 'object', required: ['id', 'commercial'],
        props: { id: str, commercial: { type: 'string', enum: COMMERCIAL }, note: str },
      },
      io: {
        type: 'object', required: ['in', 'out'],
        props: {
          in: { type: 'array', items: { type: 'string', enum: t.io }, min: 1 },
          out: { type: 'array', items: { type: 'string', enum: t.io }, min: 1 },
        },
      },
      scale: num,
      params: { type: 'object', props: { total: num, active: num } },
      contextTokens: num,
      maxOutputTokens: num,
      weightsSizeGB: num,
      pricing: {
        type: 'object', required: ['inputPerM', 'outputPerM', 'source'],
        props: { inputPerM: num, outputPerM: num, cachedInputPerM: num, note: str, source: url },
      },
      hardware: {
        type: 'object',
        props: { platforms: { type: 'array', items: { type: 'string', enum: t.platforms } }, minVramGB: num, note: str },
      },
      variants: {
        type: 'array',
        items: { type: 'object', required: ['name'], props: { name: str, params: num, weights: url, note: str } },
      },
      links: { type: 'object', props: Object.fromEntries(LINK_KEYS.map(k => [k, url])), min: 1 },
      benchmarks: {
        type: 'array',
        items: {
          type: 'object', required: ['name', 'score', 'selfReported', 'source'],
          props: { name: str, score: num, unit: str, setting: str, lowerIsBetter: bool, selfReported: bool, source: url },
        },
      },
      strengths: strList,
      limitations: strList,
      betterOptions: {
        type: 'array',
        items: {
          type: 'object', required: ['id', 'why'],
          props: { id: str, why: str, aspects: { type: 'array', items: { type: 'string', enum: ASPECTS } } },
        },
      },
      notes: str,
      tags: strList,
      lastChecked: date,
    },
  };
}

const rankingSchema = {
  type: 'object',
  required: ['task', 'updated', 'picks'],
  props: {
    task: str,
    updated: date,
    picks: {
      type: 'array', min: 1,
      items: { type: 'object', required: ['id', 'label'], props: { id: str, rank: num, label: str, why: str } },
    },
  },
};

function check(value, schema, at, errors) {
  const kind = Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value;
  if (kind !== schema.type) {
    errors.push(`${at}: expected ${schema.type}, got ${kind}`);
    return;
  }
  if (schema.enum && !schema.enum.includes(value)) errors.push(`${at}: "${value}" is not one of ${schema.enum.join(', ')}`);
  if (schema.pattern && !schema.pattern.test(value)) errors.push(`${at}: "${value}" should be ${schema.hint}`);
  if (schema.type === 'string' && schema.max && value.length > schema.max) errors.push(`${at}: longer than ${schema.max} characters`);
  if (schema.type === 'number' && !Number.isFinite(value)) errors.push(`${at}: not a finite number`);
  if (schema.type === 'array') {
    if (schema.min && value.length < schema.min) errors.push(`${at}: needs at least ${schema.min} entr${schema.min === 1 ? 'y' : 'ies'}`);
    value.forEach((v, i) => check(v, schema.items, `${at}[${i}]`, errors));
  }
  if (schema.type === 'object') {
    for (const key of schema.required || []) if (value[key] === undefined) errors.push(`${at}: missing "${key}"`);
    for (const [key, v] of Object.entries(value)) {
      if (!schema.props[key]) errors.push(`${at}: unknown field "${key}"`);
      else check(v, schema.props[key], at ? `${at}.${key}` : key, errors);
    }
    if (schema.min && Object.keys(value).length < schema.min) errors.push(`${at}: needs at least one entry`);
  }
}

export function taxonomyInfo(taxonomy) {
  const tasks = taxonomy.domains.flatMap(d => d.tasks.map(t => ({ ...t, domain: d.id })));
  return {
    tasks,
    taskIds: tasks.map(t => t.id),
    io: taxonomy.io,
    architectures: taxonomy.architectures,
    access: taxonomy.access,
    platforms: taxonomy.platforms,
  };
}

/** Validates everything together so cross-references (betterOptions, rankings) can be checked. */
export function validateCatalog({ taxonomy, models, rankings }) {
  const t = taxonomyInfo(taxonomy);
  const schema = modelSchema(t);
  const errors = [];
  const byId = new Map();

  for (const { file, data } of models) {
    const before = errors.length;
    check(data, schema, '', errors);
    for (let i = before; i < errors.length; i++) errors[i] = `${file}: ${errors[i].replace(/^: /, '')}`;
    if (!data || typeof data !== 'object') continue;
    if (data.id && file !== `${data.id}.yaml`) errors.push(`${file}: file name must be ${data.id}.yaml`);
    if (byId.has(data.id)) errors.push(`${file}: duplicate id "${data.id}"`);
    byId.set(data.id, data);
    if (data.access === 'api' && !data.pricing) errors.push(`${file}: API models need pricing`);
    if (data.released && !data.dateSource) errors.push(`${file}: "released" needs a "dateSource"`);
    if (data.params?.active && data.params?.total && data.params.active > data.params.total) {
      errors.push(`${file}: params.active is larger than params.total`);
    }
  }

  for (const m of byId.values()) {
    for (const opt of m.betterOptions || []) {
      if (opt.id === m.id) errors.push(`${m.id}.yaml: betterOptions points to itself`);
      else if (!byId.has(opt.id)) errors.push(`${m.id}.yaml: betterOptions references unknown model "${opt.id}"`);
    }
  }

  const seenTasks = new Set();
  for (const { file, data } of rankings) {
    const before = errors.length;
    check(data, rankingSchema, '', errors);
    for (let i = before; i < errors.length; i++) errors[i] = `rankings/${file}: ${errors[i].replace(/^: /, '')}`;
    if (!data?.task) continue;
    if (!t.taskIds.includes(data.task)) errors.push(`rankings/${file}: unknown task "${data.task}"`);
    if (file !== `${data.task}.yaml`) errors.push(`rankings/${file}: file name must be ${data.task}.yaml`);
    if (seenTasks.has(data.task)) errors.push(`rankings/${file}: duplicate ranking for "${data.task}"`);
    seenTasks.add(data.task);
    const ranks = new Set();
    for (const p of data.picks || []) {
      const m = byId.get(p.id);
      if (!m) errors.push(`rankings/${file}: unknown model "${p.id}"`);
      else if (!m.tasks.includes(data.task)) errors.push(`rankings/${file}: "${p.id}" is not tagged with task "${data.task}"`);
      if (p.rank !== undefined) {
        if (ranks.has(p.rank)) errors.push(`rankings/${file}: rank ${p.rank} used twice`);
        ranks.add(p.rank);
      }
    }
  }

  return errors;
}

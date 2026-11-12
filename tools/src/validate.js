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
        type: 'object', required: ['source'],
        props: {
          inputPerM: num, outputPerM: num, cachedInputPerM: num,
          perImage: num, perSecond: num, perMinute: num, perMChars: num, perMonth: num,
          note: str, source: url,
        },
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

// ---------- agents (coding agents, personal agents, control planes) and providers ----------

export const SURFACES = ['cli', 'desktop', 'ide', 'web', 'mobile', 'chat', 'cloud'];
export const OSES = ['macos', 'linux', 'windows', 'ios', 'android'];
export const AGENT_KINDS = ['coding', 'personal', 'control-plane'];
export const PROVIDER_KINDS = ['router', 'inference', 'subscription'];
export const BILLING = ['prepaid', 'payg', 'subscription', 'free'];
export const APIS = ['openai', 'openai-responses', 'anthropic', 'google'];
const PERIODS = ['month', 'year', 'seat-month', 'once'];
const AGENT_LINKS = ['repo', 'homepage', 'docs', 'pricing', 'demo'];

const plan = { type: 'object', required: ['name'], props: { name: str, price: num, period: { type: 'string', enum: PERIODS }, note: str } };
const idList = { type: 'array', items: { type: 'string', pattern: ID, hint: 'lowercase-kebab-case' } };
const common = {
  id: { type: 'string', pattern: ID, hint: 'lowercase-kebab-case' },
  name: str,
  org: str,
  summary: { type: 'string', max: 200 },
  description: str,
  strengths: strList,
  limitations: strList,
  links: { type: 'object', props: Object.fromEntries(AGENT_LINKS.map(k => [k, url])), min: 1 },
  notes: str,
  tags: strList,
  lastChecked: date,
};

const agentSchema = {
  type: 'object',
  required: ['id', 'name', 'org', 'kind', 'summary', 'surfaces', 'os', 'openSource', 'models', 'pricing', 'links', 'lastChecked'],
  props: {
    ...common,
    kind: { type: 'string', enum: AGENT_KINDS },
    surfaces: { type: 'array', items: { type: 'string', enum: SURFACES }, min: 1 },
    os: { type: 'array', items: { type: 'string', enum: OSES }, min: 1 },
    openSource: bool,
    license: str,
    released: date,
    dateSource: { type: 'string', enum: DATE_SOURCES },
    version: str,
    models: str,
    modelIds: idList,
    providers: idList,
    wraps: idList,
    pricing: { type: 'object', required: ['summary'], props: { summary: str, free: bool, plans: { type: 'array', items: plan }, source: url } },
    install: { type: 'array', items: { type: 'object', required: ['cmd'], props: { label: str, cmd: str } } },
    features: strList,
  },
};

const providerSchema = {
  type: 'object',
  required: ['id', 'name', 'org', 'kind', 'summary', 'description', 'billing', 'api', 'links', 'lastChecked'],
  props: {
    ...common,
    kind: { type: 'string', enum: PROVIDER_KINDS },
    hq: str,
    billing: { type: 'object', required: ['types'], props: { types: { type: 'array', items: { type: 'string', enum: BILLING }, min: 1 }, fee: str, freeTier: str, note: str } },
    plans: { type: 'array', items: plan },
    api: { type: 'array', items: { type: 'string', enum: APIS }, min: 1 },
    baseUrl: str,
    modelCount: num,
    models: {
      type: 'array',
      items: { type: 'object', required: ['name'], props: { id: str, name: str, inputPerM: num, outputPerM: num, cachedInputPerM: num, note: str } },
    },
    pricesSource: url,
    privacy: str,
    worksWith: idList,
  },
};

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
export function validateCatalog({ taxonomy, models, rankings, agents = [], providers = [] }) {
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
    if (data.access === 'api' && !data.pricing && !data.links?.pricing && !data.links?.homepage && !data.links?.docs) {
      errors.push(`${file}: API models need pricing or a pricing/homepage/docs link`);
    }
    const p = data.pricing;
    if (p && [p.inputPerM, p.perImage, p.perSecond, p.perMinute, p.perMChars, p.perMonth].every(v => v === undefined) && !p.note) {
      errors.push(`${file}: pricing needs at least one price or a note`);
    }
    if (data.released && !data.dateSource) errors.push(`${file}: "released" needs a "dateSource"`);
    if (data.released && data.released > new Date(Date.now() + 86400_000).toISOString().slice(0, 10)) errors.push(`${file}: "released" is in the future`);
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

  validateTools({ agents, providers, modelIds: byId }, errors);
  return errors;
}

function validateFiles(list, schema, dir, errors) {
  const ids = new Map();
  for (const { file, data } of list) {
    const before = errors.length;
    check(data, schema, '', errors);
    for (let i = before; i < errors.length; i++) errors[i] = `${dir}/${file}: ${errors[i].replace(/^: /, '')}`;
    if (!data || typeof data !== 'object') continue;
    if (data.id && file !== `${data.id}.yaml`) errors.push(`${dir}/${file}: file name must be ${data.id}.yaml`);
    if (ids.has(data.id)) errors.push(`${dir}/${file}: duplicate id "${data.id}"`);
    ids.set(data.id, data);
  }
  return ids;
}

function validateTools({ agents, providers, modelIds }, errors) {
  const a = validateFiles(agents, agentSchema, 'agents', errors);
  const p = validateFiles(providers, providerSchema, 'providers', errors);
  const ref = (at, kind, map, id) => { if (!map.has(id)) errors.push(`${at}: unknown ${kind} "${id}"`); };
  for (const x of a.values()) {
    const at = `agents/${x.id}.yaml`;
    for (const id of x.modelIds || []) ref(at, 'model', modelIds, id);
    for (const id of x.providers || []) ref(at, 'provider', p, id);
    for (const id of x.wraps || []) { if (id === x.id) errors.push(`${at}: wraps itself`); else ref(at, 'agent', a, id); }
    if (x.released && !x.dateSource) errors.push(`${at}: "released" needs a "dateSource"`);
  }
  for (const x of p.values()) {
    const at = `providers/${x.id}.yaml`;
    for (const id of x.worksWith || []) ref(at, 'agent', a, id);
    for (const m of x.models || []) if (m.id) ref(at, 'model', modelIds, m.id);
    if ((x.models || []).some(m => m.inputPerM !== undefined) && !x.pricesSource) errors.push(`${at}: model prices need a "pricesSource"`);
  }
}

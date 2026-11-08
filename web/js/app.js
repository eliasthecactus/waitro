// Waitro web app: plain modules, no build step. Routes: / · /models · /m/:id · /tasks · /t/:id · /about
import { html, raw, render } from './html.js';
import * as f from './format.js';

const app = document.getElementById('app');
let meta = null;
let modelsCache = null;

async function api(path, opts) {
  const res = await fetch(`/api${path}`, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || `Request failed (${res.status})`), { status: res.status });
  return data;
}
const getModels = async () => (modelsCache ??= (await api('/models')).models);
const taskName = id => meta.domains.flatMap(d => d.tasks).find(t => t.id === id)?.name || id;

// ---------- shared pieces ----------

function badgesFor(m, { ranks = true, max = 3 } = {}) {
  const lic = f.commercial(m.license);
  return html`<div class="badges">
    ${ranks ? m.rankings.slice(0, max).map(r => html`<a class="badge accent" href="/t/${r.task}" data-link title="${r.why}">${r.rank ? `#${r.rank} ` : '★ '}${r.taskName}: ${r.label}</a>`) : ''}
    ${m.hasBetter || m.betterOptions?.length ? html`<span class="badge new" title="A newer or more efficient model is listed on the detail page">Newer option exists</span>` : ''}
    <span class="badge">${f.accessLabel(m.access)}</span>
    <span class="badge ${lic.cls}" title="${m.license.note || ''}">${m.license.id} · ${lic.short}</span>
    ${f.platformBadges(m.platforms || m.hardware?.platforms)}
  </div>`;
}

const arrowSvg = raw('<svg viewBox="0 0 26 14" aria-hidden="true"><path d="M1 7h21m-5-5 5 5-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>');

// ---------- home / search ----------

const EXAMPLES = [
  'Upscale old 480p home videos, I only have a MacBook',
  'Transcribe our meetings with who said what, then summarize them',
  'A coding agent I can run locally for commercial work',
  'Answer questions about X-ray images, must stay on our own servers',
  'Clone my voice and read audiobooks in many languages',
  'Cheapest API model for classifying 1 million support tickets',
];

let lastSearch = { q: '', result: null };

function viewHome() {
  render(app, html`
    <section class="hero">
      <h1>Which AI is the right one?</h1>
      <p class="lead">Describe what you want to do. Waitro picks the models from its curated index, and chains several when one isn't enough.</p>
      <form class="searchbox" id="search">
        <textarea id="q" name="q" aria-label="What do you want to achieve?" maxlength="600" placeholder="e.g. Make my 24 fps drone footage 4K and 60 fps on an RTX 4090" required>${lastSearch.q}</textarea>
        <div class="row">
          <span class="muted small">${meta.ai ? 'AI search over the whole index' : 'Keyword search (AI search not configured)'}</span>
          <button class="btn" type="submit">Find models</button>
        </div>
      </form>
      <div class="examples">${EXAMPLES.map(e => html`<button class="chip-btn" type="button" data-example="${e}">${e}</button>`)}</div>
    </section>
    <section class="results" id="results" aria-live="polite"></section>
    <h2>Browse by task</h2>
    ${domainsGrid()}
  `);
  const form = document.getElementById('search');
  const box = document.getElementById('q');
  form.addEventListener('submit', e => { e.preventDefault(); runSearch(box.value); });
  box.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) form.requestSubmit(); });
  app.querySelectorAll('[data-example]').forEach(b => b.addEventListener('click', () => { box.value = b.dataset.example; runSearch(box.value); }));
  if (lastSearch.result) showResults(lastSearch.result);
}

function domainsGrid() {
  return html`<div class="domains">${meta.domains.map(d => html`
    <div class="domain"><h3>${d.name}</h3><ul>${d.tasks.map(t => html`
      <li class="${t.count ? '' : 'none'}"><a href="/t/${t.id}" data-link>${t.name}${t.ranked ? ' ★' : ''}</a><span class="count">${t.count}</span></li>`)}
    </ul></div>`)}
  </div>`;
}

async function runSearch(q) {
  q = q.trim();
  if (q.length < 3) return;
  const out = document.getElementById('results');
  const btn = document.querySelector('#search button');
  btn.disabled = true;
  btn.textContent = 'Thinking…';
  render(out, html`<p class="loading">Reading ${meta.count} models and matching them to your goal…</p>`);
  try {
    const [result] = await Promise.all([api('/search', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ q }) }), getModels()]);
    lastSearch = { q, result };
    showResults(result);
  } catch (e) {
    render(out, html`<p class="note">${e.message}</p>`);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Find models';
  }
}

function showResults(r) {
  const out = document.getElementById('results');
  if (!out) return;
  const byId = new Map(modelsCache.map(m => [m.id, m]));
  render(out, html`
    ${r.note ? html`<p class="note">${r.note}</p>` : ''}
    ${r.understanding ? html`<p class="understanding">${r.understanding}</p>` : ''}
    ${r.constraints?.length ? html`<div class="badges">${r.constraints.map(c => html`<span class="badge accent">${c}</span>`)}</div>` : ''}
    ${r.recommendations.length ? html`<div class="cards">${r.recommendations.map(rec => {
      const m = byId.get(rec.id);
      return html`<article class="card ${rec.verdict}">
        <span class="verdict ${rec.verdict}">${{ best: 'Best fit', good: 'Good option', alternative: 'Alternative', match: 'Keyword match' }[rec.verdict]}</span>
        <h3><a href="/m/${m.id}" data-link>${m.name}</a></h3>
        <div class="org">${m.org}${m.released ? ` · ${f.date(m.released)}` : ''}</div>
        <p class="why">${rec.why}</p>
        ${rec.caveats ? html`<p class="caveat">${rec.caveats}</p>` : ''}
        <div class="foot-row">${badgesFor(m, { max: 1 })}</div>
      </article>`;
    })}</div>` : html`<p class="empty">No model in the index fits this yet.</p>`}
    ${r.pipelines?.length ? html`<h2>Suggested chains</h2>${r.pipelines.map(p => html`
      <div class="pipeline">
        <h3>${p.title}</h3>
        <p class="muted">${p.why}</p>
        <div class="flow">${p.steps.map((s, i) => html`
          ${i ? html`<div class="arrow ${s.handoff?.length ? '' : 'broken'}">${arrowSvg}<span>${s.handoff?.length ? `${s.handoff.join(' / ')}${s.fromEarlier ? ' (earlier)' : ''}` : 'types don’t match'}</span></div>` : ''}
          <div class="step"><span class="n">Step ${i + 1}</span><a href="/m/${s.id}" data-link>${byId.get(s.id)?.name || s.id}</a><p>${s.does}</p></div>`)}
        </div>
        ${p.connected ? '' : html`<p class="caveat small">One hand-off between steps doesn’t match the listed input and output types; check that step before relying on it.</p>`}
      </div>`)}` : ''}
    ${r.gaps ? html`<p class="note">${r.gaps}</p>` : ''}
  `);
}

// ---------- table ----------

const COLS = [
  { key: 'name', label: 'Model', get: m => m.name.toLowerCase() },
  { key: 'tasks', label: 'Tasks' },
  { key: 'access', label: 'Type', get: m => m.access },
  { key: 'license', label: 'License', get: m => `${f.commercialOrder(m.license)}${m.license.id}` },
  { key: 'params', label: 'Params', get: m => m.params?.total ?? null, num: true },
  { key: 'context', label: 'Context', get: m => m.contextTokens, num: true },
  { key: 'price', label: 'Price in / out', get: m => m.pricing ? m.pricing.inputPerM + m.pricing.outputPerM / 4 : null, num: true },
  { key: 'released', label: 'Released', get: m => m.released, num: true },
  { key: 'platforms', label: 'Runs on' },
];

async function viewModels(params) {
  const models = await getModels();
  const state = {
    q: params.get('q') || '', task: params.get('task') || '', access: params.get('access') || '',
    commercial: params.get('commercial') || '', platform: params.get('platform') || '',
    current: params.get('current') === '1', sort: params.get('sort') || 'released', dir: params.get('dir') || 'desc',
  };
  render(app, html`
    <h1>All models</h1>
    <div class="filters" id="filters">
      <input type="search" name="q" placeholder="Filter by name, org, tag…" value="${state.q}" aria-label="Filter">
      <select name="task" aria-label="Task"><option value="">All tasks</option>${meta.domains.map(d => html`
        <optgroup label="${d.name}">${d.tasks.filter(t => t.count).map(t => html`<option value="${t.id}" ${t.id === state.task ? 'selected' : ''}>${t.name} (${t.count})</option>`)}</optgroup>`)}
      </select>
      <select name="access" aria-label="Type">${[['', 'Open + API'], ['open', 'Open weights'], ['api', 'API only']].map(([v, l]) => html`<option value="${v}" ${v === state.access ? 'selected' : ''}>${l}</option>`)}</select>
      <select name="commercial" aria-label="Commercial use">${[['', 'Any license'], ['yes', 'Commercial use OK'], ['limited', 'Commercial OK or with conditions'], ['no', 'Non-commercial only']].map(([v, l]) => html`<option value="${v}" ${v === state.commercial ? 'selected' : ''}>${l}</option>`)}</select>
      <select name="platform" aria-label="Runs on"><option value="">Any hardware</option>${meta.platforms.map(p => html`<option value="${p}" ${p === state.platform ? 'selected' : ''}>${f.platformName(p)}</option>`)}</select>
      <label class="check"><input type="checkbox" name="current" ${state.current ? 'checked' : ''}> Hide models with a newer option</label>
    </div>
    <div class="count-line" id="count"></div>
    <div class="table-wrap"><table>
      <thead><tr>${COLS.map(c => html`<th data-key="${c.key}">${c.get ? html`<button type="button">${c.label}<span class="dir">↕</span></button>` : c.label}</th>`)}</tr></thead>
      <tbody id="rows"></tbody>
    </table></div>
  `);

  const update = () => {
    const shown = models.filter(m => {
      if (state.task && !m.tasks.includes(state.task)) return false;
      if (state.access === 'open' && m.access === 'api') return false;
      if (state.access === 'api' && m.access === 'open-weights') return false;
      if (state.commercial === 'yes' && m.license.commercial !== 'yes') return false;
      if (state.commercial === 'limited' && !['yes', 'limited'].includes(m.license.commercial)) return false;
      if (state.commercial === 'no' && m.license.commercial !== 'no') return false;
      if (state.platform && !m.platforms.includes(state.platform)) return false;
      if (state.current && m.hasBetter) return false;
      if (state.q) {
        const hay = `${m.name} ${m.org} ${m.summary} ${m.tags.join(' ')} ${m.license.id} ${m.tasks.join(' ')}`.toLowerCase();
        if (!state.q.toLowerCase().split(/\s+/).every(w => hay.includes(w))) return false;
      }
      return true;
    });
    const col = COLS.find(c => c.key === state.sort) || COLS[7];
    const sign = state.dir === 'asc' ? 1 : -1;
    shown.sort((a, b) => {
      const x = col.get(a), y = col.get(b);
      if (x == null && y == null) return a.name.localeCompare(b.name);
      if (x == null) return 1;
      if (y == null) return -1;
      return (x < y ? -1 : x > y ? 1 : 0) * sign || a.name.localeCompare(b.name);
    });
    document.getElementById('count').textContent = `${shown.length} of ${models.length} models`;
    render(document.getElementById('rows'), shown.length ? html`${shown.map(m => html`<tr>
      <td><a class="name" href="/m/${m.id}" data-link>${m.name}</a><div class="sub">${m.org}</div>
        ${m.rankings.length || m.hasBetter ? html`<div class="badges mt4">${m.rankings.slice(0, 2).map(r => html`<span class="badge accent">${r.rank ? `#${r.rank}` : '★'} ${r.taskName}</span>`)}${m.hasBetter ? html`<span class="badge new">Newer option</span>` : ''}</div>` : ''}</td>
      <td><div class="badges">${m.tasks.slice(0, 2).map(t => html`<span class="badge">${taskName(t)}</span>`)}${m.tasks.length > 2 ? html`<span class="badge" title="${m.tasks.slice(2).map(taskName).join(', ')}">+${m.tasks.length - 2}</span>` : ''}</div></td>
      <td>${f.accessShort(m.access)}</td>
      <td><span class="badge ${f.commercial(m.license).cls}" title="${m.license.note || ''}">${m.license.id}</span><div class="sub">${f.commercial(m.license).short}</div></td>
      <td class="num">${f.params(m.params)}</td>
      <td class="num">${f.tokens(m.contextTokens)}</td>
      <td class="num">${f.price(m.pricing)}</td>
      <td class="num">${m.released ? f.date(m.released) : html`<span class="muted">–</span>`}</td>
      <td><div class="badges">${f.platformBadges(m.platforms)}</div></td>
    </tr>`)}` : html`<tr><td colspan="${COLS.length}" class="empty">No model matches these filters.</td></tr>`);
    app.querySelectorAll('th[data-key]').forEach(th => {
      const on = th.dataset.key === state.sort;
      th.classList.toggle('sorted', on);
      th.setAttribute('aria-sort', on ? (state.dir === 'asc' ? 'ascending' : 'descending') : 'none');
      const d = th.querySelector('.dir');
      if (d) d.textContent = on ? (state.dir === 'asc' ? '↑' : '↓') : '↕';
    });
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(state)) if (v && !(k === 'sort' && v === 'released') && !(k === 'dir' && v === 'desc')) p.set(k, v === true ? '1' : v);
    history.replaceState(null, '', `/models${p.size ? `?${p}` : ''}`);
  };

  const filters = document.getElementById('filters');
  filters.addEventListener('input', e => {
    const el = e.target;
    state[el.name] = el.type === 'checkbox' ? el.checked : el.value;
    update();
  });
  app.querySelectorAll('th[data-key] button').forEach(b => b.addEventListener('click', () => {
    const key = b.parentElement.dataset.key;
    if (state.sort === key) state.dir = state.dir === 'asc' ? 'desc' : 'asc';
    else { state.sort = key; state.dir = ['name', 'access', 'license'].includes(key) ? 'asc' : 'desc'; }
    update();
  }));
  update();
}

// ---------- model detail ----------

async function viewModel(id) {
  let m;
  try { m = await api(`/models/${id}`); } catch (e) { return notFound(e.status === 404 ? 'This model is not in the index.' : e.message); }
  document.title = `${m.name} · Waitro`;
  const lic = f.commercial(m.license);
  const facts = [
    ['Type', f.accessLabel(m.access)],
    ['License', html`${m.license.id}${m.license.note ? html`<div class="muted small">${m.license.note}</div>` : ''}`],
    ['Commercial use', html`<span class="badge ${lic.cls}">${lic.long}</span>`],
    ['Input → output', `${m.io.in.join(', ')} → ${m.io.out.join(', ')}`],
    m.architecture && ['Architecture', f.archName(m.architecture)],
    m.params && ['Parameters', f.params(m.params, true)],
    m.contextTokens && ['Context window', `${f.tokens(m.contextTokens)} tokens`],
    m.maxOutputTokens && ['Max output', `${f.tokens(m.maxOutputTokens)} tokens`],
    m.scale && ['Upscale factor', `${m.scale}×`],
    m.weightsSizeGB && ['Weights size', `${m.weightsSizeGB} GB`],
    m.pricing && ['Price per 1M tokens', html`$${m.pricing.inputPerM} in / $${m.pricing.outputPerM} out${m.pricing.cachedInputPerM != null ? html`<div class="muted small">Cached input $${m.pricing.cachedInputPerM}</div>` : ''}${m.pricing.note ? html`<div class="muted small">${m.pricing.note}</div>` : ''}`],
    m.hardware?.platforms?.length && ['Runs on', html`<div class="badges">${f.platformBadges(m.hardware.platforms, true)}</div>`],
    m.hardware?.minVramGB && ['Min VRAM', `${m.hardware.minVramGB} GB`],
    ['Released', m.released ? html`${f.date(m.released, true)}<div class="muted small">from ${m.dateSource}</div>` : html`<span class="muted">Not verified yet</span>`],
    m.stats?.stars != null && ['GitHub stars', f.num(m.stats.stars)],
    m.stats?.downloads != null && ['HF downloads (30 days)', f.num(m.stats.downloads)],
  ].filter(Boolean);

  render(app, html`
    <nav class="crumbs"><a href="/models" data-link>All models</a>${m.tasks.map(t => html`<span>·</span><a href="/t/${t}" data-link>${taskName(t)}</a>`)}</nav>
    <header class="detail-head">
      <h1>${m.name}</h1>
      <div class="muted">${m.org}</div>
      <p class="lead">${m.summary}</p>
      ${m.rankings.length ? html`<div class="rank-badges">${m.rankings.map(r => html`<a class="rank" href="/t/${r.task}" data-link>
        <strong>${r.rank ? `#${r.rank}` : '★'}</strong><span>${r.rank ? `of ${r.of} in` : 'Top pick in'} ${r.taskName} · ${r.label}</span></a>`)}</div>` : ''}
    </header>

    ${m.betterOptions.length ? html`<section class="callout better">
      <h2>Newer or more efficient options</h2>
      <ul>${m.betterOptions.map(o => html`<li>
        <div class="t"><a href="/m/${o.id}" data-link><strong>${o.name}</strong></a>${o.released ? html`<span class="muted small">${f.date(o.released)}</span>` : ''}${(o.aspects || []).map(a => html`<span class="badge new">${f.aspect(a)}</span>`)}</div>
        <span>${o.why}</span></li>`)}</ul>
    </section>` : ''}

    <dl class="facts">${facts.map(([k, v]) => html`<div class="fact"><dt>${k}</dt><dd>${v}</dd></div>`)}</dl>
    ${m.hardware?.note ? html`<p class="muted small mt8">${m.hardware.note}</p>` : ''}

    ${m.description ? html`<h2>About</h2><div class="prose">${m.description.trim().split(/\n\s*\n/).map(p => html`<p>${p}</p>`)}</div>` : ''}

    ${m.strengths?.length || m.limitations?.length ? html`<div class="two mt24">
      ${m.strengths?.length ? html`<div class="panel"><h2>Good at</h2><ul>${m.strengths.map(s => html`<li>${s}</li>`)}</ul></div>` : ''}
      ${m.limitations?.length ? html`<div class="panel"><h2>Watch out for</h2><ul>${m.limitations.map(s => html`<li>${s}</li>`)}</ul></div>` : ''}
    </div>` : ''}

    ${m.improvesOn.length ? html`<h2>Recommended over</h2><ul class="prose">${m.improvesOn.map(o => html`<li><a href="/m/${o.id}" data-link>${o.name}</a>: ${o.why}</li>`)}</ul>` : ''}

    ${m.benchmarks?.length ? html`<h2>Benchmarks</h2><div class="table-wrap"><table>
      <thead><tr><th>Benchmark</th><th>Score</th><th>Setting</th><th>Source</th></tr></thead>
      <tbody>${m.benchmarks.map(b => html`<tr><td>${b.name}</td><td class="num">${b.score}${b.unit ? ` ${b.unit}` : ''}${b.lowerIsBetter ? html` <span class="muted small">(lower is better)</span>` : ''}</td>
        <td>${b.setting || ''}</td><td>${b.selfReported ? html`<span class="badge warn">Self-reported</span> ` : ''}<a href="${b.source}" rel="noopener" target="_blank">source</a></td></tr>`)}</tbody>
    </table></div>` : ''}

    ${m.variants?.length ? html`<h2>Variants</h2><div class="table-wrap"><table>
      <thead><tr><th>Variant</th><th>Params</th><th>Notes</th><th></th></tr></thead>
      <tbody>${m.variants.map(v => html`<tr><td>${v.name}</td><td class="num">${v.params ? `${v.params}B` : '–'}</td><td>${v.note || ''}</td><td>${v.weights ? html`<a href="${v.weights}" rel="noopener" target="_blank">weights</a>` : ''}</td></tr>`)}</tbody>
    </table></div>` : ''}

    <h2>Links</h2>
    <div class="links">${Object.entries(m.links).map(([k, u]) => html`<a href="${u}" rel="noopener" target="_blank">${f.linkName(k)} ↗</a>`)}</div>

    ${Object.entries(m.topPicks).map(([t, r]) => r.picks.length ? html`<h2>Other top picks for ${r.name}</h2>
      <ul class="picks">${r.picks.map(p => html`<li class="pick"><span class="pos">${p.rank ? `#${p.rank}` : '★'}</span>
        <span><a class="label" href="/m/${p.id}" data-link>${p.name}</a> <span class="muted">· ${p.label}</span></span><p>${p.why || p.summary}</p></li>`)}</ul>` : '')}

    <p class="muted small mt32">Last checked ${f.date(m.lastChecked, true)}.${m.notes ? ` ${m.notes}` : ''}
      Something wrong or outdated? <a href="${m.editUrl}" rel="noopener" target="_blank">Suggest a change on GitHub</a>.</p>
  `);
}

// ---------- tasks ----------

function viewTasks() {
  document.title = 'Tasks · Waitro';
  render(app, html`<h1>Tasks</h1><p class="muted">★ means the task has curated top picks.</p>${domainsGrid()}`);
}

async function viewTask(id) {
  let t;
  try { t = await api(`/tasks/${id}`); } catch (e) { return notFound(e.status === 404 ? 'Unknown task.' : e.message); }
  document.title = `${t.name} · Waitro`;
  const byId = new Map(t.models.map(m => [m.id, m]));
  const ranked = new Set(t.ranking?.picks.map(p => p.id) || []);
  render(app, html`
    <nav class="crumbs"><a href="/tasks" data-link>Tasks</a><span>·</span><span>${meta.domains.find(d => d.id === t.domain)?.name}</span></nav>
    <h1>${t.name}</h1>
    ${t.ranking ? html`<h2>Top picks</h2>
      <ul class="picks">${t.ranking.picks.map(p => html`<li class="pick"><span class="pos">${p.rank ? `#${p.rank}` : '★'}</span>
        <span><a class="label" href="/m/${p.id}" data-link>${byId.get(p.id).name}</a> <span class="muted">· ${p.label}</span></span><p>${p.why}</p></li>`)}</ul>
      <p class="muted small">Editorial picks, updated ${f.date(t.ranking.updated, true)}. LLM picks are labelled by use case rather than numbered, since vendors measure benchmarks differently.</p>`
      : html`<p class="muted">No curated ranking for this task yet.</p>`}
    <h2>${t.ranking ? 'All models for this task' : 'Models'}</h2>
    ${t.models.length ? html`<div class="cards">${t.models.sort((a, b) => Number(ranked.has(b.id)) - Number(ranked.has(a.id)) || (b.released || '').localeCompare(a.released || '')).map(m => html`
      <article class="card"><h3><a href="/m/${m.id}" data-link>${m.name}</a></h3><div class="org">${m.org}${m.released ? ` · ${f.date(m.released)}` : ''}</div>
        <p class="why">${m.summary}</p><div class="foot-row">${badgesFor(m, { max: 1 })}</div></article>`)}</div>`
      : html`<p class="empty">Nothing here yet. <a href="${meta.repo}" rel="noopener" target="_blank">Suggest a model</a>.</p>`}
  `);
}

// ---------- about ----------

function viewAbout() {
  document.title = 'About · Waitro';
  render(app, html`<div class="prose">
    <h1>About Waitro</h1>
    <p>There are millions of AI models and new ones every day. Waitro is a small, hand-curated index of the ones worth knowing, with the facts you need to choose: what it does, what it runs on, what it costs and what the licence allows.</p>
    <h2>How the search works</h2>
    <p>When you describe a goal, Claude reads the whole index and picks the models that fit, with reasons and trade-offs. When one model can't do the job, it suggests a chain, for example speech-to-text, then an LLM summary, then text-to-speech. The server checks every suggestion against the index, so it can only recommend models that are actually listed, and it flags chains whose input and output types don't fit together.</p>
    <h2>How models get in</h2>
    <ul>
      <li>Every entry is a YAML file in the <a href="${meta.repo}" rel="noopener" target="_blank">public repository</a>, checked against the model card, paper, repo or vendor pricing page.</li>
      <li>Numbers from the authors themselves are marked <span class="badge warn">Self-reported</span>.</li>
      <li>Release dates are only shown when they could be verified, with their source.</li>
      <li>When a newer or more efficient model replaces one, its page says so at the top.</li>
      <li>Top picks per task are editorial and dated.</li>
    </ul>
    <h2>Contribute</h2>
    <p>Found something wrong, or a model that should be here? Open an issue or a pull request on <a href="${meta.repo}" rel="noopener" target="_blank">GitHub</a>. Every model page has a link to its file.</p>
    <p class="muted small">Waitro ${meta.version} · ${meta.count} models · Not affiliated with any model vendor. Medical models listed here are not medical devices.</p>
  </div>`);
}

function notFound(msg = 'Page not found.') {
  render(app, html`<h1>Not found</h1><p>${msg}</p><p><a href="/" data-link>Back to search</a></p>`);
}

// ---------- router ----------

async function route() {
  const { pathname, search } = location;
  const section = pathname === '/' ? 'home' : pathname.split('/')[1] === 'm' ? 'models' : pathname.split('/')[1] === 't' ? 'tasks' : pathname.split('/')[1];
  document.querySelectorAll('[data-nav]').forEach(a => a.classList.toggle('active', a.dataset.nav === section));
  document.title = 'Waitro · Which AI is the right one?';
  let m;
  try {
    if (pathname === '/') viewHome();
    else if (pathname === '/models') await viewModels(new URLSearchParams(search));
    else if ((m = pathname.match(/^\/m\/([a-z0-9-]+)$/))) await viewModel(m[1]);
    else if (pathname === '/tasks') viewTasks();
    else if ((m = pathname.match(/^\/t\/([a-z0-9-]+)$/))) await viewTask(m[1]);
    else if (pathname === '/about') viewAbout();
    else notFound();
  } catch (e) {
    render(app, html`<p class="note">${e.message}</p>`);
  }
}

document.addEventListener('click', e => {
  const a = e.target.closest('a[data-link]');
  if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
  e.preventDefault();
  if (a.getAttribute('href') !== location.pathname + location.search) history.pushState(null, '', a.getAttribute('href'));
  route().then(() => { window.scrollTo(0, 0); app.focus({ preventScroll: true }); });
});
window.addEventListener('popstate', route);

meta = await api('/meta');
document.getElementById('foot-meta').textContent = `v${meta.version} · ${meta.count} models`;
route();

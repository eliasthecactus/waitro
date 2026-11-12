// After the Angular build: give every app route its own index.html (so deep links answer 200 on GitHub Pages)
// and add 404.html as a fallback. Each copy gets a page title and description for link previews.
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dist = path.join(root, 'web/dist/browser');
const html = readFileSync(path.join(dist, 'index.html'), 'utf8');
const meta = JSON.parse(readFileSync(path.join(dist, 'data/meta.json'), 'utf8'));
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function page(title, description) {
  return html
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(description)}">`);
}

function write(route, title, description) {
  const dir = path.join(dist, route);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, 'index.html'), page(title, description));
}

let n = 0;
write('models', 'All models · Waitro', `Every model in the Waitro index (${meta.count}), sortable by date, licence, size and price.`); n++;
write('tasks', 'Tasks · Waitro', 'Browse AI models by what you want to do.'); n++;
write('agents', 'Agents · Waitro', `Coding agents, personal agents and the apps that run them (${meta.agentCount}), with prices and supported models.`); n++;
write('providers', 'Providers · Waitro', `Where to run AI models (${meta.providerCount} providers): routers, inference clouds and coding subscriptions, with their offers.`); n++;
write('about', 'About · Waitro', 'How Waitro finds the right AI model for what you want to do.'); n++;
for (const d of meta.domains) for (const t of d.tasks) { write(`t/${t.id}`, `${t.name} · Waitro`, `${t.count} AI models for ${t.name.toLowerCase()}, with top picks and licences.`); n++; }
for (const f of readdirSync(path.join(dist, 'data/m'))) {
  const m = JSON.parse(readFileSync(path.join(dist, 'data/m', f), 'utf8'));
  write(`m/${m.id}`, `${m.name} · Waitro`, m.summary);
  n++;
}
for (const [dir, route] of [['a', 'a'], ['p', 'p']]) {
  for (const f of readdirSync(path.join(dist, 'data', dir))) {
    const x = JSON.parse(readFileSync(path.join(dist, 'data', dir, f), 'utf8'));
    write(`${route}/${x.id}`, `${x.name} · Waitro`, x.summary);
    n++;
  }
}
writeFileSync(path.join(dist, '404.html'), page('Not found · Waitro', 'This page does not exist.'));
console.log(`routes: ${n} pages + 404.html`);

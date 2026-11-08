// Serves the built site like GitHub Pages: static files under a base path, 404.html for unknown paths.
// Usage: node src/preview.mjs [--base /waitro/] [--port 4300]
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const arg = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const base = arg('--base', '/');
const port = Number(arg('--port', 4300));
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../web/dist/browser');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.txt': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://local');
  if (!url.pathname.startsWith(base)) {
    res.writeHead(302, { location: base }).end();
    return;
  }
  const rel = decodeURIComponent(url.pathname.slice(base.length)) || 'index.html';
  const file = path.join(root, path.normalize(rel).replace(/^(\.\.[/\\])+/, ''));
  try {
    const s = await stat(file);
    const target = s.isDirectory() ? path.join(file, 'index.html') : file;
    res.writeHead(200, { 'content-type': TYPES[path.extname(target)] || 'application/octet-stream' }).end(await readFile(target));
  } catch {
    res.writeHead(404, { 'content-type': TYPES['.html'] }).end(await readFile(path.join(root, '404.html')).catch(() => 'Not found'));
  }
}).listen(port, () => console.log(`Preview on http://localhost:${port}${base}`));

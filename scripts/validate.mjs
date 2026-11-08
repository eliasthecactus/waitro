// Validates data/ (used in CI and before every commit that touches the catalog).
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCatalog } from '../server/src/catalog.js';

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../data');
try {
  const c = loadCatalog(dir);
  console.log(`OK: ${c.models.length} models, ${Object.keys(c.rankings).length} rankings, digest ${c.digest.length} chars`);
} catch (e) {
  console.error(e.message);
  process.exit(1);
}

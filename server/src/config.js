import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');

export const PORT = Number(process.env.PORT || 3000);
export const CATALOG_DIR = path.resolve(process.env.CATALOG_DIR || path.join(root, 'data'));
export const WEB_DIR = path.resolve(process.env.WEB_DIR || path.join(root, 'web'));
export const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(root, '.data'));
export const REPO_URL = process.env.REPO_URL || 'https://github.com/eliasthecactus/waitro';

// AI search. Without a key the site still works and search falls back to keywords.
export const AI_ENABLED = Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
export const AI_MODEL = process.env.WAITRO_MODEL || 'claude-opus-5-5';
export const AI_EFFORT = process.env.WAITRO_EFFORT || 'low';
export const AI_PER_IP_PER_HOUR = Number(process.env.WAITRO_AI_PER_IP_PER_HOUR || 20);
export const AI_PER_DAY = Number(process.env.WAITRO_AI_PER_DAY || 1000);
export const CACHE_DAYS = Number(process.env.WAITRO_CACHE_DAYS || 7);

export const VERSION = JSON.parse(readFileSync(path.join(here, '../package.json'), 'utf8')).version;

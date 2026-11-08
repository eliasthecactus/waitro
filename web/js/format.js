import { html } from './html.js';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function date(d, long = false) {
  if (!d) return '';
  const [y, m, day] = d.split('-').map(Number);
  return long ? `${day} ${MONTHS[m - 1]} ${y}` : `${MONTHS[m - 1]} ${y}`;
}

const COMMERCIAL = {
  yes: { cls: 'good', short: 'commercial OK', long: 'Allowed' },
  limited: { cls: 'warn', short: 'with conditions', long: 'Allowed with conditions' },
  no: { cls: 'bad', short: 'non-commercial', long: 'Not allowed' },
  unknown: { cls: '', short: 'unclear', long: 'Unclear, read the licence' },
};
export const commercial = l => COMMERCIAL[l.commercial] || COMMERCIAL.unknown;
export const commercialOrder = l => ({ yes: 0, limited: 1, unknown: 2, no: 3 })[l.commercial] ?? 2;
export const accessLabel = a => ({ 'open-weights': 'Open weights', api: 'API', both: 'Open weights + API' })[a] || a;

const PLATFORMS = { cuda: ['NVIDIA', 'NVIDIA GPU (CUDA)'], rocm: ['AMD', 'AMD GPU (ROCm)'], 'apple-silicon': ['Mac', 'Apple Silicon Mac'], cpu: ['CPU', 'CPU'], onnx: ['ONNX', 'ONNX runtime'], browser: ['Browser', 'In the browser'], api: ['Cloud API', 'Cloud API'] };
export const platformName = p => PLATFORMS[p]?.[1] || p;
export const platformBadges = (list = [], long = false) => list.map(p => html`<span class="badge">${PLATFORMS[p]?.[long ? 1 : 0] || p}</span>`);

const b = n => (n >= 1000 ? `${+(n / 1000).toFixed(2)}T` : n >= 1 ? `${+n.toFixed(1)}B` : `${Math.round(n * 1000)}M`);
export function params(p, long = false) {
  if (!p?.total) return '–';
  if (!p.active) return b(p.total);
  return long ? `${b(p.total)} total, ${b(p.active)} active per token` : `${b(p.total)} (${b(p.active)} act.)`;
}
export function tokens(n) {
  if (!n) return '–';
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(2)}M`;
  return `${Math.round(n / 1024) >= 1 && n % 1024 === 0 ? n / 1024 : Math.round(n / 1000)}K`;
}
export const price = p => (p ? `$${p.inputPerM} / $${p.outputPerM}` : '–');
export const num = n => new Intl.NumberFormat('en').format(n);
export const archName = a => ({ transformer: 'Transformer', 'moe-transformer': 'Mixture-of-experts transformer', diffusion: 'Diffusion', gan: 'GAN', cnn: 'CNN', hybrid: 'Hybrid', other: 'Other' })[a] || a;
export const aspect = a => ({ speed: 'Faster', memory: 'Less memory', quality: 'Better quality', license: 'Better licence', cost: 'Cheaper', size: 'Smaller', modalities: 'More modalities', languages: 'More languages', hardware: 'Runs on more hardware' })[a] || a;
export const linkName = k => ({ repo: 'Code', paper: 'Paper', weights: 'Weights', homepage: 'Website', docs: 'Docs', pricing: 'Pricing', demo: 'Demo' })[k] || k;
export const accessShort = a => ({ 'open-weights': 'Open', api: 'API', both: 'Open + API' })[a] || a;

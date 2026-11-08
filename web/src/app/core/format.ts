import { Access, License, Params, Pricing } from './types';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function date(d: string | null | undefined, long = false): string {
  if (!d) return '';
  const [y, m, day] = d.split('-').map(Number);
  return long ? `${day} ${MONTHS[m - 1]} ${y}` : `${MONTHS[m - 1]} ${y}`;
}

const sz = (n: number) => (n >= 1000 ? `${+(n / 1000).toFixed(2)}T` : n >= 1 ? `${+n.toFixed(1)}B` : `${Math.round(n * 1000)}M`);
export function params(p: Params | null | undefined, long = false): string {
  if (!p?.total) return '';
  if (!p.active) return sz(p.total);
  return long ? `${sz(p.total)} · ${sz(p.active)} active` : `${sz(p.total)} / ${sz(p.active)}`;
}

export function tokens(n: number | null | undefined): string {
  if (!n) return '';
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(2)}M`;
  return n % 1024 === 0 ? `${n / 1024}K` : `${Math.round(n / 1000)}K`;
}

export const money = (n: number) => `$${n < 1 ? n.toFixed(2) : +n.toFixed(2)}`;
export function price(p: Pricing | null | undefined): string {
  if (!p) return '';
  if (p.inputPerM !== undefined) return `${money(p.inputPerM)} / ${money(p.outputPerM ?? 0)}`;
  if (p.perImage !== undefined) return `${money(p.perImage)} / image`;
  if (p.perSecond !== undefined) return `${money(p.perSecond)} / s`;
  if (p.perMinute !== undefined) return `${money(p.perMinute)} / min`;
  if (p.perMChars !== undefined) return `${money(p.perMChars)} / 1M chars`;
  if (p.perMonth !== undefined) return `${money(p.perMonth)} / month`;
  return '';
}
/** Sort key across price units: per-token prices first, then the rest by amount. */
export const priceSort = (p: Pricing | null | undefined) =>
  !p ? null : p.inputPerM !== undefined ? p.inputPerM + (p.outputPerM ?? 0) / 4
    : 1000 + (p.perImage ?? p.perSecond ?? p.perMinute ?? p.perMChars ?? p.perMonth ?? 0);
export const compact = (n: number) => new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n);

export interface CommercialInfo { cls: string; short: string; long: string }
const COMMERCIAL: Record<string, CommercialInfo> = {
  yes: { cls: 'chip-good', short: 'Commercial OK', long: 'Commercial use allowed' },
  limited: { cls: 'chip-warn', short: 'Conditions', long: 'Commercial use with conditions' },
  no: { cls: 'chip-bad', short: 'Non-commercial', long: 'Non-commercial only' },
  unknown: { cls: '', short: 'Unclear', long: 'Unclear, read the licence' },
};
export const commercial = (l: License) => COMMERCIAL[l.commercial] ?? COMMERCIAL['unknown'];
export const commercialOrder = (l: License) => ({ yes: 0, limited: 1, unknown: 2, no: 3 })[l.commercial] ?? 2;

export const accessLabel = (a: Access) => ({ 'open-weights': 'Open weights', api: 'API', both: 'Open weights + API' })[a];
export const accessShort = (a: Access) => ({ 'open-weights': 'Open', api: 'API', both: 'Open + API' })[a];

export const PLATFORM_NAMES: Record<string, [string, string]> = {
  cuda: ['NVIDIA', 'NVIDIA GPU'],
  rocm: ['AMD', 'AMD GPU'],
  'apple-silicon': ['Mac', 'Apple Silicon Mac'],
  cpu: ['CPU', 'Any CPU'],
  onnx: ['ONNX', 'ONNX runtime'],
  browser: ['Browser', 'In the browser'],
  api: ['Cloud', 'Cloud API'],
};
export const platformName = (p: string, long = false) => PLATFORM_NAMES[p]?.[long ? 1 : 0] ?? p;

export const archName = (a: string | null | undefined) =>
  a ? ({ transformer: 'Transformer', 'moe-transformer': 'Mixture of experts', diffusion: 'Diffusion', gan: 'GAN', cnn: 'CNN', hybrid: 'Hybrid', other: 'Other' } as Record<string, string>)[a] ?? a : '';

export const aspectName = (a: string) =>
  ({ speed: 'Faster', memory: 'Less memory', quality: 'Better quality', license: 'Better licence', cost: 'Cheaper', size: 'Smaller', modalities: 'More modalities', languages: 'More languages', hardware: 'More hardware' } as Record<string, string>)[a] ?? a;

export const linkName = (k: string) =>
  ({ repo: 'Code', paper: 'Paper', weights: 'Weights', homepage: 'Website', docs: 'Docs', pricing: 'Pricing', demo: 'Demo' } as Record<string, string>)[k] ?? k;

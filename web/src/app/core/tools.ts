import {
  LucideAppWindow, LucideBot, LucideCloud, LucideCodeXml, LucideCreditCard, LucideGift, LucideGlobe, LucideMessageCircle,
  LucidePanelsTopLeft, LucideRepeat, LucideRoute, LucideServer, LucideSmartphone, LucideTerminal, LucideWallet,
} from '@lucide/angular';
import { PriceFrom } from './types';

/** Labels and icons for agents (surfaces, kinds) and providers (kinds, billing, APIs). */

export const SURFACE: Record<string, [string, any]> = {
  cli: ['Terminal', LucideTerminal],
  ide: ['IDE', LucideCodeXml],
  desktop: ['Desktop app', LucideAppWindow],
  web: ['Web', LucideGlobe],
  mobile: ['Phone', LucideSmartphone],
  chat: ['Chat apps', LucideMessageCircle],
  cloud: ['Cloud agent', LucideCloud],
};
export const surfaceName = (s: string) => SURFACE[s]?.[0] ?? s;
export const surfaceIcon = (s: string) => SURFACE[s]?.[1] ?? LucideGlobe;

export const OS_NAME: Record<string, string> = { macos: 'macOS', linux: 'Linux', windows: 'Windows', ios: 'iOS', android: 'Android' };
export const osName = (o: string) => OS_NAME[o] ?? o;

export interface KindInfo { name: string; long: string; icon: any; tone: string }

export const AGENT_KIND: Record<string, KindInfo> = {
  coding: { name: 'Coding agent', long: 'Writes and edits code in your repo', icon: LucideCodeXml, tone: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-300' },
  personal: { name: 'Personal agent', long: 'Always-on assistant you reach from chat apps', icon: LucideBot, tone: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300' },
  'control-plane': { name: 'Agent app', long: 'One interface that runs other agents', icon: LucidePanelsTopLeft, tone: 'bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-300' },
};

export const PROVIDER_KIND: Record<string, KindInfo> = {
  router: { name: 'Router', long: 'One API and one balance in front of many providers', icon: LucideRoute, tone: 'bg-cyan-500/12 text-cyan-700 dark:text-cyan-300' },
  inference: { name: 'Inference cloud', long: 'Runs the models on its own hardware', icon: LucideServer, tone: 'bg-amber-500/12 text-amber-700 dark:text-amber-300' },
  subscription: { name: 'Coding plan', long: 'Monthly plan with usage limits, made for coding agents', icon: LucideRepeat, tone: 'bg-violet-500/12 text-violet-700 dark:text-violet-300' },
};

export const BILLING: Record<string, [string, any]> = {
  prepaid: ['Prepaid credit', LucideWallet],
  payg: ['Pay per token', LucideCreditCard],
  subscription: ['Subscription', LucideRepeat],
  free: ['Free tier', LucideGift],
};
export const billingName = (b: string) => BILLING[b]?.[0] ?? b;
export const billingIcon = (b: string) => BILLING[b]?.[1] ?? LucideCreditCard;

export const API_NAME: Record<string, string> = { openai: 'OpenAI Chat', 'openai-responses': 'OpenAI Responses', anthropic: 'Anthropic Messages', google: 'Google Gemini' };
export const apiName = (a: string) => API_NAME[a] ?? a;

const PER: Record<string, string> = { month: '/mo', year: '/yr', 'seat-month': '/seat/mo', once: ' once' };
export function planPrice(p: { price?: number; period?: string } | null | undefined): string {
  if (!p || p.price === undefined) return '';
  if (p.price === 0) return 'Free';
  return `$${+p.price.toFixed(2)}${PER[p.period ?? ''] ?? ''}`;
}
export const fromPrice = (p: PriceFrom | null) => (p ? `from ${planPrice(p)}` : '');

/** Per-1M price with enough digits for very cheap models. */
export function perM(n: number | undefined): string {
  if (n === undefined) return '';
  if (n === 0) return 'free';
  // Two decimals like a price tag, more only when the provider lists more (e.g. $0.245, $0.0039).
  for (const d of [2, 3, 4]) if (Math.abs(+n.toFixed(d) - n) < 1e-9 || d === 4) return `$${n.toFixed(d)}`;
  return `$${n}`;
}

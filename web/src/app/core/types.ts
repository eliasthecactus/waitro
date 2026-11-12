export type Access = 'open-weights' | 'api' | 'both';
export type Commercial = 'yes' | 'limited' | 'no' | 'unknown';

export interface License { id: string; commercial: Commercial; note?: string }
export interface Io { in: string[]; out: string[] }
export interface Params { total?: number; active?: number }
export interface Pricing {
  inputPerM?: number; outputPerM?: number; cachedInputPerM?: number;
  perImage?: number; perSecond?: number; perMinute?: number; perMChars?: number; perMonth?: number;
  note?: string; source: string;
}
export interface Ranking { task: string; taskName: string; rank: number | null; label: string; why: string; of: number }
export interface Stats { stars?: number; lastCommit?: string; downloads?: number; likes?: number }

export interface ModelSummary {
  id: string;
  name: string;
  org: string;
  released: string | null;
  summary: string;
  tasks: string[];
  domains: string[];
  architecture: string | null;
  access: Access;
  license: License;
  io: Io;
  params: Params | null;
  contextTokens: number | null;
  pricing: Pricing | null;
  platforms: string[];
  minVramGB: number | null;
  rankings: Ranking[];
  hasBetter: boolean;
  better: { id: string; aspects: string[] }[];
  stats: Stats | null;
  tags: string[];
}

export interface Brief { id: string; name: string; summary: string; released: string | null; access: Access }
export interface BetterOption extends Brief { why: string; aspects?: string[] }
export interface Benchmark { name: string; score: number; unit?: string; setting?: string; lowerIsBetter?: boolean; selfReported: boolean; source: string }
export interface Variant { name: string; params?: number; weights?: string; note?: string }
export interface Pick { id: string; rank?: number; label: string; why?: string }

export interface ModelDetail extends Omit<ModelSummary, 'platforms' | 'minVramGB' | 'hasBetter' | 'better'> {
  dateSource?: string;
  description?: string;
  scale?: number;
  maxOutputTokens?: number;
  weightsSizeGB?: number;
  hardware?: { platforms?: string[]; minVramGB?: number; note?: string };
  variants?: Variant[];
  links: Record<string, string>;
  benchmarks?: Benchmark[];
  strengths?: string[];
  limitations?: string[];
  betterOptions: BetterOption[];
  improvesOn: BetterOption[];
  notes?: string;
  lastChecked: string;
  topPicks: Record<string, { name: string; picks: (Pick & Brief)[] }>;
  offeredBy: Offer[];
  usedBy: AgentBrief[];
  editUrl: string;
}

export interface Task { id: string; name: string; domain: string; count: number; ranked: boolean }
export interface Domain { id: string; name: string; tasks: Task[] }
export interface Meta {
  version: string;
  repo: string;
  builtAt: string;
  catalogHash: string;
  count: number;
  agentCount: number;
  providerCount: number;
  domains: Domain[];
  io: string[];
  platforms: string[];
  architectures: string[];
}

export interface TaskPage {
  id: string;
  name: string;
  domain: string;
  ranking: { task: string; name: string; updated: string; picks: Pick[] } | null;
  models: ModelSummary[];
}

export type Verdict = 'best' | 'good' | 'alternative' | 'match';
export interface Recommendation { id: string; verdict: Verdict; why: string; caveats: string }
export interface PipelineStep { id: string; does: string; handoff?: string[]; fromEarlier?: boolean }
export interface Pipeline { title: string; why: string; steps: PipelineStep[]; connected: boolean }
export interface SearchResult {
  mode: 'ai' | 'keyword';
  note?: string;
  cached?: boolean;
  needKey?: boolean;
  keyError?: boolean;
  understanding: string;
  constraints: string[];
  recommendations: Recommendation[];
  pipelines: Pipeline[];
  gaps: string;
}

// ---------- agents and providers ----------

export interface Plan { name: string; price?: number; period?: 'month' | 'year' | 'seat-month' | 'once'; note?: string }
export interface AgentBrief { id: string; name: string; org: string; kind: string; summary: string; openSource: boolean }
export interface ProviderBrief { id: string; name: string; org: string; kind: string; summary: string; billing: string[] }
export interface PriceFrom { price: number; period: string }

export interface AgentSummary {
  id: string; name: string; org: string; kind: string; summary: string; surfaces: string[]; os: string[]; openSource: boolean;
  license: string | null; version: string | null; pricing: { summary: string; free: boolean; from: PriceFrom | null };
  providers: string[]; wraps: string[]; stats: Stats | null; tags: string[];
}
export interface AgentDetail extends Omit<AgentSummary, 'providers' | 'wraps' | 'pricing'> {
  description?: string; released?: string; dateSource?: string; models: string;
  pricing: { summary: string; free?: boolean; plans?: Plan[]; source?: string };
  install?: { label?: string; cmd: string }[]; features?: string[]; strengths?: string[]; limitations?: string[];
  links: Record<string, string>; notes?: string; lastChecked: string; editUrl: string;
  providers: ProviderBrief[]; wraps: AgentBrief[]; wrappedBy: AgentBrief[]; builtFor: Brief[];
}

export interface ProviderModel { id?: string; name: string; inputPerM?: number; outputPerM?: number; cachedInputPerM?: number; note?: string; catalogName?: string }
export interface Billing { types: string[]; fee?: string; freeTier?: string; note?: string }
export interface ProviderSummary {
  id: string; name: string; org: string; kind: string; summary: string; hq: string | null;
  billing: Billing; api: string[]; from: PriceFrom | null; modelCount: number | null; worksWith: string[]; tags: string[];
}
export interface ProviderDetail extends Omit<ProviderSummary, 'worksWith' | 'from' | 'modelCount'> {
  description: string; plans?: Plan[]; baseUrl?: string; modelCount?: number; models: ProviderModel[]; pricesSource?: string;
  privacy?: string; strengths?: string[]; limitations?: string[]; links: Record<string, string>; notes?: string; lastChecked: string;
  editUrl: string; worksWith: AgentBrief[];
}
export interface Offer extends ProviderModel { provider: string; providerName: string; providerKind: string }

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

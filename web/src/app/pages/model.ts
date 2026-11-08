import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import {
  LucideArrowLeft, LucideArrowRight, LucideArrowUpRight, LucideCircleCheck, LucideCircleMinus, LucideDynamicIcon,
  LucideExternalLink, LucidePencil, LucideSparkles, LucideTrophy, LucideInfo, LucideClock, LucideDownload,
} from '@lucide/angular';
import { Api } from '../core/api';
import { accessLabel, archName, aspectName, commercial, compact, date, linkName, money, params, platformName, price, tokens } from '../core/format';
import { ASPECT_ICON, IO_ICON, LINK_ICON, PLATFORM_ICON } from '../core/icons';
import { ModelDetail } from '../core/types';
import { IconTile } from '../ui/icon-tile';

@Component({
  selector: 'app-model',
  imports: [
    RouterLink, IconTile, LucideDynamicIcon, LucideArrowLeft, LucideArrowRight, LucideArrowUpRight, LucideCircleCheck, LucideCircleMinus,
    LucideExternalLink, LucidePencil, LucideSparkles, LucideTrophy, LucideInfo, LucideClock, LucideDownload,
  ],
  template: `
    @if (error()) {
      <div class="wrap pt-24 text-center">
        <h1 class="text-3xl font-semibold tracking-tight">Model not found</h1>
        <p class="mt-2 text-muted">{{ error() }}</p>
        <a routerLink="/models" class="btn btn-ghost mt-6"><svg lucideArrowLeft [size]="15" />All models</a>
      </div>
    } @else if (m(); as m) {
      <div class="relative">
        <div class="hero-glow pointer-events-none absolute inset-x-0 top-0 -z-10 h-80 opacity-70"></div>
        <div class="wrap pt-8 sm:pt-10">
          <nav class="flex flex-wrap items-center gap-1.5 text-sm text-muted">
            <a routerLink="/models" class="flex items-center gap-1 hover:text-ink"><svg lucideArrowLeft [size]="14" />All models</a>
            @for (t of m.tasks; track t) { <span class="text-faint">/</span><a [routerLink]="['/t', t]" class="hover:text-ink">{{ api.taskName(t) }}</a> }
          </nav>

          <!-- Header -->
          <header class="mt-6 flex flex-col gap-5 sm:flex-row sm:items-start">
            <app-icon-tile size="lg" [task]="m.tasks[0]" [domain]="m.domains[0]" />
            <div class="min-w-0 flex-1">
              <h1 class="text-3xl font-semibold tracking-[-0.03em] sm:text-5xl">{{ m.name }}</h1>
              <p class="mt-2 text-muted">{{ m.org }}@if (m.released) { <span class="text-faint"> · </span>{{ date(m.released, true) }} }</p>
              <p class="mt-4 max-w-3xl text-lg leading-relaxed">{{ m.summary }}</p>
              @if (m.rankings.length) {
                <div class="mt-5 flex flex-wrap gap-2">
                  @for (r of m.rankings; track r.task) {
                    <a [routerLink]="['/t', r.task]" class="group inline-flex items-center gap-2 rounded-xl border border-accent/25 bg-accent-soft py-1.5 pl-2 pr-3 text-sm text-accent-ink transition hover:border-accent/50">
                      <span class="grid size-6 place-items-center rounded-lg bg-accent text-white dark:text-bg"><svg lucideTrophy [size]="13" /></span>
                      <span><strong class="num font-semibold">{{ r.rank ? '#' + r.rank : 'Top pick' }}</strong>@if (r.rank) {<span class="text-accent-ink/70"> of {{ r.of }}</span>} in {{ r.taskName }} · {{ r.label }}</span>
                    </a>
                  }
                </div>
              }
              <div class="mt-6 flex flex-wrap gap-2">
                @for (l of links(); track l[0]) {
                  <a [href]="l[1]" target="_blank" rel="noopener" class="btn btn-ghost !py-2"><svg [lucideIcon]="linkIcon(l[0])" [size]="15" />{{ linkName(l[0]) }}<svg lucideArrowUpRight [size]="13" class="text-faint" /></a>
                }
              </div>
            </div>
          </header>

          <!-- Newer option banner -->
          @if (m.betterOptions.length) {
            <section class="relative mt-10 overflow-hidden rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 via-surface to-indigo-500/10 p-5 sm:p-6">
              <div class="flex items-center gap-2 text-sm font-semibold text-cyan-700 dark:text-cyan-300"><svg lucideSparkles [size]="16" />There’s a newer or more efficient option</div>
              <div class="mt-4 grid gap-3" [class.md:grid-cols-2]="m.betterOptions.length > 1">
                @for (o of m.betterOptions; track o.id) {
                  <a [routerLink]="['/m', o.id]" class="group flex flex-col gap-3 rounded-xl border border-line bg-surface/80 p-4 backdrop-blur transition hover:border-line-strong">
                    <div class="flex items-start justify-between gap-3">
                      <div>
                        <p class="text-lg font-semibold tracking-tight group-hover:text-accent-ink">{{ o.name }}</p>
                        @if (o.released) { <p class="text-xs text-muted">Released {{ date(o.released, true) }}</p> }
                      </div>
                      <span class="grid size-8 shrink-0 place-items-center rounded-full bg-ink text-bg transition group-hover:translate-x-0.5"><svg lucideArrowRight [size]="15" /></span>
                    </div>
                    @if (o.aspects?.length) {
                      <div class="flex flex-wrap gap-1.5">@for (a of o.aspects; track a) { <span class="chip chip-new"><svg [lucideIcon]="aspectIcon(a)" [size]="12" />{{ aspectName(a) }}</span> }</div>
                    }
                    <p class="text-sm leading-relaxed text-muted">{{ o.why }}</p>
                  </a>
                }
              </div>
            </section>
          }

          <!-- Key facts -->
          <section class="mt-10 grid grid-cols-2 overflow-hidden rounded-2xl border border-line bg-surface sm:grid-cols-3 lg:grid-cols-6">
            @for (f of keyFacts(); track f.label) {
              <div class="flex flex-col gap-1 p-4 shadow-[-1px_-1px_0_var(--line)]">
                <span class="eyebrow !text-[10px]">{{ f.label }}</span>
                <span class="text-lg font-semibold leading-tight tracking-tight tabular-nums" [class]="f.cls ?? ''">{{ f.value }}</span>
                @if (f.sub) { <span class="text-xs text-muted">{{ f.sub }}</span> }
              </div>
            }
          </section>

          <div class="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
            <!-- Main column -->
            <div class="flex min-w-0 flex-col gap-10">
              @if (m.description) {
                <section>
                  <h2 class="text-xl font-semibold tracking-tight">About</h2>
                  @for (p of paragraphs(); track $index) { <p class="mt-3 max-w-3xl leading-relaxed text-muted">{{ p }}</p> }
                </section>
              }

              @if (m.strengths?.length || m.limitations?.length) {
                <section class="grid gap-4 sm:grid-cols-2">
                  @if (m.strengths?.length) {
                    <div class="card p-5">
                      <h3 class="text-sm font-semibold">Good at</h3>
                      <ul class="mt-3 flex flex-col gap-2.5">
                        @for (s of m.strengths; track s) { <li class="flex gap-2.5 text-sm leading-snug"><svg lucideCircleCheck [size]="16" class="mt-px shrink-0 text-emerald-500" />{{ s }}</li> }
                      </ul>
                    </div>
                  }
                  @if (m.limitations?.length) {
                    <div class="card p-5">
                      <h3 class="text-sm font-semibold">Watch out for</h3>
                      <ul class="mt-3 flex flex-col gap-2.5">
                        @for (s of m.limitations; track s) { <li class="flex gap-2.5 text-sm leading-snug"><svg lucideCircleMinus [size]="16" class="mt-px shrink-0 text-amber-500" />{{ s }}</li> }
                      </ul>
                    </div>
                  }
                </section>
              }

              @if (m.benchmarks?.length) {
                <section>
                  <h2 class="text-xl font-semibold tracking-tight">Benchmarks</h2>
                  <ul class="card mt-4 divide-y divide-line">
                    @for (b of m.benchmarks; track b.name) {
                      <li class="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:gap-6">
                        <div class="min-w-0 flex-1">
                          <p class="font-medium">{{ b.name }}</p>
                          @if (b.setting) { <p class="mt-0.5 text-sm text-muted">{{ b.setting }}</p> }
                        </div>
                        <div class="flex items-center gap-3 sm:justify-end">
                          <span class="num text-xl font-medium tracking-tight">{{ b.score }}@if (b.unit) {<span class="ml-1 text-sm text-muted">{{ b.unit }}</span>}@if (b.lowerIsBetter) {<span class="ml-1 text-xs text-faint" title="Lower is better">↓</span>}</span>
                          @if (b.selfReported) { <span class="chip chip-warn">Self-reported</span> }
                          <a [href]="b.source" target="_blank" rel="noopener" class="inline-flex items-center gap-1 text-sm text-accent-ink hover:underline">Source<svg lucideExternalLink [size]="12" /></a>
                        </div>
                      </li>
                    }
                  </ul>
                </section>
              }

              @if (m.variants?.length) {
                <section>
                  <h2 class="text-xl font-semibold tracking-tight">Variants</h2>
                  <div class="mt-4 grid gap-3 sm:grid-cols-2">
                    @for (v of m.variants; track v.name) {
                      <div class="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface p-4">
                        <div class="min-w-0">
                          <p class="font-medium">{{ v.name }}</p>
                          <p class="truncate text-xs text-muted">@if (v.params) {<span class="num">{{ v.params }}B</span>}@if (v.params && v.note) { · }{{ v.note }}</p>
                        </div>
                        @if (v.weights) { <a [href]="v.weights" target="_blank" rel="noopener" class="btn btn-ghost shrink-0 !px-3 !py-1.5 !text-xs"><svg lucideDownload [size]="13" />Weights</a> }
                      </div>
                    }
                  </div>
                </section>
              }

              @if (m.improvesOn.length) {
                <section>
                  <h2 class="text-xl font-semibold tracking-tight">Recommended over</h2>
                  <div class="mt-4 flex flex-col gap-2">
                    @for (o of m.improvesOn; track o.id) {
                      <a [routerLink]="['/m', o.id]" class="group flex items-center gap-3 rounded-xl border border-line bg-surface p-3.5 transition hover:border-line-strong">
                        <span class="min-w-0 flex-1">
                          <span class="font-medium group-hover:text-accent-ink">{{ o.name }}</span>
                          <span class="mt-0.5 block text-sm text-muted">{{ o.why }}</span>
                        </span>
                        <svg lucideArrowUpRight [size]="16" class="shrink-0 text-faint" />
                      </a>
                    }
                  </div>
                </section>
              }
            </div>

            <!-- Sidebar -->
            <aside class="flex flex-col gap-4 lg:sticky lg:top-20 lg:self-start">
              <div class="card p-5">
                <h3 class="text-sm font-semibold">Specs</h3>
                <dl class="mt-3 flex flex-col divide-y divide-line text-sm">
                  @for (s of specs(); track s[0]) {
                    <div class="flex justify-between gap-4 py-2"><dt class="shrink-0 text-muted">{{ s[0] }}</dt><dd class="text-right font-medium tabular-nums">{{ s[1] }}</dd></div>
                  }
                  <div class="flex justify-between gap-4 py-2">
                    <dt class="text-muted">Input → output</dt>
                    <dd class="flex flex-wrap items-center justify-end gap-1">
                      @for (t of m.io.in; track t) { <span class="grid size-6 place-items-center rounded-md bg-subtle text-muted" [title]="t"><svg [lucideIcon]="ioIcon(t)" [size]="13" /></span> }
                      <svg lucideArrowRight [size]="13" class="text-faint" />
                      @for (t of m.io.out; track t) { <span class="grid size-6 place-items-center rounded-md bg-subtle text-muted" [title]="t"><svg [lucideIcon]="ioIcon(t)" [size]="13" /></span> }
                    </dd>
                  </div>
                </dl>
                @if (m.hardware?.platforms?.length) {
                  <h3 class="mt-5 text-sm font-semibold">Runs on</h3>
                  <div class="mt-2 flex flex-wrap gap-1.5">
                    @for (p of m.hardware!.platforms!; track p) { <span class="chip"><svg [lucideIcon]="platformIcon(p)" [size]="12" />{{ platformName(p, true) }}</span> }
                  </div>
                }
                @if (m.hardware?.note) { <p class="mt-3 text-[13px] leading-snug text-muted">{{ m.hardware!.note }}</p> }
                @if (m.license.note) {
                  <p class="mt-4 flex gap-2 rounded-xl bg-subtle p-3 text-[13px] leading-snug text-muted"><svg lucideInfo [size]="14" class="mt-0.5 shrink-0" />{{ m.license.note }}</p>
                }
              </div>

              @for (t of topPickTasks(); track t.id) {
                <div class="card p-5">
                  <h3 class="flex items-center gap-2 text-sm font-semibold"><svg lucideTrophy [size]="14" class="text-accent" />Top picks · {{ t.name }}</h3>
                  <ul class="mt-3 flex flex-col gap-1">
                    @for (p of t.picks; track p.id) {
                      <li>
                        <a [routerLink]="['/m', p.id]" class="group -mx-2 flex items-start gap-2.5 rounded-lg px-2 py-2 transition hover:bg-subtle">
                          <span class="num w-6 shrink-0 pt-px text-sm font-semibold text-accent-ink">{{ p.rank ? '#' + p.rank : '★' }}</span>
                          <span class="min-w-0"><span class="block truncate text-sm font-medium group-hover:text-accent-ink">{{ p.name }}</span><span class="block text-xs text-muted">{{ p.label }}</span></span>
                        </a>
                      </li>
                    }
                  </ul>
                </div>
              }

              <div class="flex flex-col gap-2 px-1 text-xs text-muted">
                <span class="flex items-center gap-1.5"><svg lucideClock [size]="13" />Checked {{ date(m.lastChecked, true) }}@if (m.released && m.dateSource) { · date from {{ m.dateSource }} }</span>
                @if (m.notes) { <span class="flex gap-1.5"><svg lucideInfo [size]="13" class="mt-px shrink-0" />{{ m.notes }}</span> }
                <a [href]="m.editUrl" target="_blank" rel="noopener" class="flex items-center gap-1.5 hover:text-ink"><svg lucidePencil [size]="13" />Suggest a change on GitHub</a>
              </div>
            </aside>
          </div>
        </div>
      </div>
    } @else {
      <div class="wrap pt-10">
        <div class="flex gap-5"><div class="shimmer size-14 rounded-2xl"></div><div class="flex-1 space-y-3 pt-1"><div class="shimmer h-9 w-1/3 rounded-lg"></div><div class="shimmer h-4 w-1/4 rounded"></div><div class="shimmer h-4 w-2/3 rounded"></div></div></div>
        <div class="shimmer mt-10 h-24 rounded-2xl"></div>
      </div>
    }
  `,
})
export class ModelPage {
  protected readonly api = inject(Api);
  private readonly title = inject(Title);
  readonly id = input.required<string>();
  protected readonly m = signal<ModelDetail | null>(null);
  protected readonly error = signal('');

  protected readonly date = date;
  protected readonly linkName = linkName;
  protected readonly aspectName = aspectName;
  protected readonly platformName = platformName;

  protected readonly links = computed(() => Object.entries(this.m()?.links ?? {}));
  protected readonly paragraphs = computed(() => (this.m()?.description ?? '').trim().split(/\n\s*\n/).map(p => p.replace(/\s+/g, ' ')));
  protected readonly topPickTasks = computed(() =>
    Object.entries(this.m()?.topPicks ?? {}).filter(([, r]) => r.picks.length).map(([id, r]) => ({ id, ...r })));

  protected readonly keyFacts = computed(() => {
    const m = this.m();
    if (!m) return [];
    const c = commercial(m.license);
    const facts: { label: string; value: string; sub?: string; cls?: string }[] = [
      { label: 'Type', value: accessLabel(m.access) },
      { label: 'License', value: m.license.id, sub: c.long, cls: { 'chip-good': 'text-emerald-600 dark:text-emerald-400', 'chip-warn': 'text-amber-600 dark:text-amber-400', 'chip-bad': 'text-rose-600 dark:text-rose-400' }[c.cls] },
    ];
    if (m.params?.total) facts.push({ label: 'Parameters', value: params({ total: m.params.total }), sub: m.params.active ? `${params({ total: m.params.active })} active` : undefined });
    if (m.contextTokens) facts.push({ label: 'Context', value: tokens(m.contextTokens), sub: 'tokens' });
    if (m.pricing?.inputPerM !== undefined) facts.push({ label: 'Price / 1M', value: `${money(m.pricing.inputPerM)} · ${money(m.pricing.outputPerM ?? 0)}`, sub: 'input · output' });
    else if (price(m.pricing)) facts.push({ label: 'Price', value: price(m.pricing), sub: m.pricing?.note });
    if (m.scale) facts.push({ label: 'Upscale', value: `${m.scale}×` });
    if (m.hardware?.minVramGB) facts.push({ label: 'Min VRAM', value: `${m.hardware.minVramGB} GB` });
    if (m.stats?.stars) facts.push({ label: 'GitHub stars', value: compact(m.stats.stars) });
    if (m.stats?.downloads) facts.push({ label: 'Downloads', value: compact(m.stats.downloads), sub: 'last 30 days' });
    facts.push({ label: 'Released', value: m.released ? date(m.released) : '—', sub: m.released ? undefined : 'not verified yet' });
    return facts.slice(0, 6);
  });

  protected readonly specs = computed(() => {
    const m = this.m();
    if (!m) return [];
    return [
      ['Architecture', archName(m.architecture)],
      ['Parameters', params(m.params, true)],
      ['Context window', m.contextTokens ? `${tokens(m.contextTokens)} tokens` : ''],
      ['Max output', m.maxOutputTokens ? `${tokens(m.maxOutputTokens)} tokens` : ''],
      ['Cached input', m.pricing?.cachedInputPerM != null ? `${money(m.pricing.cachedInputPerM)} / 1M` : ''],
      ['Pricing note', m.pricing?.note ?? ''],
      ['Weights size', m.weightsSizeGB ? `${m.weightsSizeGB} GB` : ''],
      ['Last commit', m.stats?.lastCommit ? date(m.stats.lastCommit, true) : ''],
    ].filter(s => s[1]);
  });

  constructor() {
    effect(() => {
      const id = this.id();
      this.m.set(null);
      this.error.set('');
      this.api.model(id).then(
        m => { this.m.set(m); this.title.setTitle(`${m.name} · Waitro`); },
        e => this.error.set(e.status === 404 ? 'This model is not in the index.' : e.message),
      );
    });
  }

  protected linkIcon = (k: string) => LINK_ICON[k] ?? LINK_ICON['homepage'];
  protected aspectIcon = (a: string) => ASPECT_ICON[a] ?? ASPECT_ICON['quality'];
  protected ioIcon = (t: string) => IO_ICON[t] ?? IO_ICON['text'];
  protected platformIcon = (p: string) => PLATFORM_ICON[p];
}

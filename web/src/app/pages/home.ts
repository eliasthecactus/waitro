import { Component, ElementRef, Injectable, OnDestroy, computed, effect, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  LucideArrowRight, LucideArrowUpRight, LucideCornerDownLeft, LucideDynamicIcon, LucideInfo, LucideLoaderCircle,
  LucideRotateCcw, LucideSparkles, LucideTriangleAlert, LucideCircleCheck, LucideMoveRight,
} from '@lucide/angular';
import { Api } from '../core/api';
import { aspectName, date } from '../core/format';
import { ASPECT_ICON, DOMAIN_ICON, DOMAIN_TONE, TASK_ICON } from '../core/icons';
import { SearchResult } from '../core/types';
import { IconTile } from '../ui/icon-tile';
import { ModelCard } from '../ui/model-card';
import { PipelineView } from '../ui/pipeline';

/** Keeps the last search alive while the user browses model pages. */
@Injectable({ providedIn: 'root' })
export class SearchState {
  readonly query = signal('');
  readonly result = signal<SearchResult | null>(null);
  readonly busy = signal(false);
  readonly error = signal('');
  private readonly api = inject(Api);
  private seq = 0;

  async run(q: string) {
    q = q.trim();
    if (q.length < 3 || (q === this.query() && (this.result() || this.busy()))) return;
    const id = ++this.seq;
    this.query.set(q);
    this.busy.set(true);
    this.error.set('');
    this.result.set(null);
    try {
      const r = await this.api.search(q);
      if (id === this.seq) this.result.set(r);
    } catch (e) {
      if (id === this.seq) this.error.set((e as Error).message);
    } finally {
      if (id === this.seq) this.busy.set(false);
    }
  }

  clear() {
    this.seq++;
    this.query.set('');
    this.result.set(null);
    this.error.set('');
    this.busy.set(false);
  }
}

const EXAMPLES = [
  { text: 'Upscale old 480p home videos on my MacBook', task: 'video-upscaling', domain: 'video' },
  { text: 'Transcribe meetings with who said what, then summarize', task: 'speech-to-text', domain: 'audio' },
  { text: 'A coding agent I can run locally for commercial work', task: 'coding', domain: 'language' },
  { text: 'Answer questions about X-rays, must stay on our servers', task: 'medical', domain: 'specialized' },
  { text: 'Clone my voice and read audiobooks in many languages', task: 'voice-cloning', domain: 'audio' },
  { text: 'Cheapest API model to classify a million support tickets', task: 'chat', domain: 'language' },
];

const STEPS = ['Understanding what you want to do', 'Matching it against every model in the index', 'Checking hardware, licences and prices', 'Building chains where one model isn’t enough'];

@Component({
  selector: 'app-home',
  imports: [
    RouterLink, ModelCard, PipelineView, IconTile, LucideDynamicIcon, LucideSparkles, LucideArrowRight, LucideCornerDownLeft,
    LucideTriangleAlert, LucideInfo, LucideRotateCcw, LucideLoaderCircle, LucideCircleCheck, LucideMoveRight,
  ],
  template: `
    <!-- Hero -->
    <section class="relative overflow-hidden">
      <div class="hero-glow pointer-events-none absolute inset-0 -z-10"></div>
      <div class="grid-bg pointer-events-none absolute inset-0 -z-10 opacity-60"></div>
      <div class="wrap pb-10 pt-14 sm:pt-24">
        <div class="mx-auto max-w-3xl text-center">
          <a routerLink="/models" class="fade-up inline-flex items-center gap-2 rounded-full border border-line bg-surface/80 px-3 py-1 text-xs text-muted backdrop-blur transition hover:border-line-strong hover:text-ink">
            <span class="relative flex size-2"><span class="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60"></span><span class="relative inline-flex size-2 rounded-full bg-emerald-500"></span></span>
            <span class="num">{{ api.meta()?.count }}</span> hand-checked models · updated {{ updated() }}
            <svg lucideArrowRight [size]="12" />
          </a>
          <h1 class="fade-up mt-6 text-[2.6rem] font-semibold leading-[1.02] tracking-[-0.035em] sm:text-7xl">
            Which AI is the<br /><span class="gradient-text">right one?</span>
          </h1>
          <p class="fade-up mx-auto mt-5 max-w-xl text-base text-muted sm:text-lg">
            Describe what you want to do. Waitro picks the right models from its index, explains the trade-offs and chains several when one isn’t enough.
          </p>
        </div>

        <form class="fade-up mx-auto mt-10 max-w-2xl" (submit)="submit($event)">
          <div class="search-ring" [class.busy]="state.busy()">
            <div class="flex flex-col rounded-[calc(1.25rem-1px)] bg-surface">
              <div class="flex items-start gap-3 px-4 pt-4 sm:px-5">
                <svg lucideSparkles [size]="20" class="mt-0.5 shrink-0 text-accent" />
                <textarea #box rows="2" maxlength="600" [value]="state.query()" (input)="autosize()"
                  (keydown.enter)="enter($event)" aria-label="What do you want to achieve?"
                  placeholder="What do you want to achieve? e.g. make my drone footage 4K and 60 fps on an RTX 4090"
                  class="max-h-56 min-h-[3.25rem] w-full resize-none bg-transparent text-base leading-relaxed outline-none placeholder:text-faint sm:text-[17px]"></textarea>
              </div>
              <div class="flex items-center justify-between gap-3 px-3 pb-3 pt-2 sm:px-4">
                <span class="flex items-center gap-1.5 pl-1 text-xs text-faint">
                  @if (api.meta()?.ai) { <svg lucideSparkles [size]="12" /> AI search over the whole index }
                  @else { <svg lucideInfo [size]="12" /> Keyword search (AI not configured) }
                </span>
                <button type="submit" class="btn btn-primary !rounded-xl !py-2" [disabled]="state.busy()">
                  @if (state.busy()) { <svg lucideLoaderCircle [size]="16" class="animate-spin" /> Thinking }
                  @else { Find models <span class="hidden items-center gap-0.5 rounded-md bg-bg/15 px-1.5 py-0.5 text-[11px] font-medium sm:inline-flex">⌘<svg lucideCornerDownLeft [size]="11" /></span> }
                </button>
              </div>
            </div>
          </div>
        </form>

        @if (!state.result() && !state.busy()) {
          <div class="fade-up mx-auto mt-6 grid max-w-2xl gap-2 sm:grid-cols-2">
            @for (e of examples; track e.text) {
              <button type="button" (click)="example(e.text)"
                class="group flex items-center gap-2.5 rounded-xl border border-line bg-surface/70 p-1.5 pr-3 text-left text-[13px] leading-snug text-muted backdrop-blur transition hover:border-line-strong hover:text-ink">
                <app-icon-tile size="sm" [task]="e.task" [domain]="e.domain" />
                {{ e.text }}
              </button>
            }
          </div>
        }
      </div>
    </section>

    <!-- Results -->
    @if (state.busy() || state.result() || state.error()) {
      <section class="wrap scroll-mt-20" id="results" aria-live="polite">
        @if (state.busy()) {
          <div class="mx-auto max-w-2xl card p-5">
            <ul class="flex flex-col gap-3">
              @for (s of steps; track s; let i = $index) {
                <li class="flex items-center gap-3 text-sm transition" [class.text-faint]="i > step()" [class.text-ink]="i <= step()">
                  @if (i < step()) { <svg lucideCircleCheck [size]="17" class="text-emerald-500" /> }
                  @else if (i === step()) { <svg lucideLoaderCircle [size]="17" class="animate-spin text-accent" /> }
                  @else { <span class="mx-[2px] size-[13px] rounded-full border border-line-strong"></span> }
                  {{ s }}
                </li>
              }
            </ul>
          </div>
          <div class="mt-8 grid gap-4 md:grid-cols-3">
            @for (i of [1, 2, 3]; track i) {
              <div class="card flex flex-col gap-3 p-5">
                <div class="flex gap-3"><div class="shimmer size-10 rounded-xl"></div><div class="flex-1 space-y-2 pt-1"><div class="shimmer h-3 w-2/3 rounded"></div><div class="shimmer h-2.5 w-1/3 rounded"></div></div></div>
                <div class="shimmer h-2.5 rounded"></div><div class="shimmer h-2.5 w-5/6 rounded"></div><div class="shimmer h-2.5 w-4/6 rounded"></div>
              </div>
            }
          </div>
        } @else if (state.error()) {
          <div class="mx-auto flex max-w-2xl items-center gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/5 p-4 text-sm text-rose-700 dark:text-rose-300">
            <svg lucideTriangleAlert [size]="18" class="shrink-0" />{{ state.error() }}
          </div>
        } @else if (state.result(); as r) {
          <div class="fade-up">
            @if (r.note) {
              <div class="mb-6 flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-800 dark:text-amber-300">
                <svg lucideInfo [size]="18" class="shrink-0" />{{ r.note }}
              </div>
            }
            <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div class="max-w-3xl">
                <p class="eyebrow">{{ r.mode === 'ai' ? 'What you need' : 'Results' }}</p>
                @if (r.understanding) { <p class="mt-2 text-xl font-medium leading-snug tracking-tight sm:text-2xl">{{ r.understanding }}</p> }
                @if (r.constraints.length) {
                  <div class="mt-3 flex flex-wrap gap-1.5">
                    @for (c of r.constraints; track c) { <span class="chip chip-accent">{{ c }}</span> }
                  </div>
                }
              </div>
              <button type="button" class="btn btn-ghost shrink-0 !py-2" (click)="reset()"><svg lucideRotateCcw [size]="15" />New search</button>
            </div>

            @if (r.recommendations.length) {
              <div class="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                @for (rec of r.recommendations; track rec.id) {
                  <app-model-card [id]="rec.id" [verdict]="rec.verdict" [why]="rec.verdict === 'match' ? '' : rec.why" [caveats]="rec.caveats" />
                }
              </div>
            } @else {
              <p class="mt-8 text-muted">No model in the index fits this yet.</p>
            }

            @if (r.pipelines.length) {
              <h2 class="mt-14 text-2xl font-semibold tracking-tight">Suggested chains</h2>
              <p class="mt-1 text-sm text-muted">When one model can’t do the whole job.</p>
              <div class="mt-5 flex flex-col gap-4">
                @for (p of r.pipelines; track p.title) { <app-pipeline [pipeline]="p" /> }
              </div>
            }

            @if (r.gaps) {
              <div class="mt-8 flex gap-3 rounded-2xl border border-line bg-subtle p-4 text-sm text-muted">
                <svg lucideInfo [size]="18" class="mt-0.5 shrink-0" /><span><strong class="font-medium text-ink">Not covered yet.</strong> {{ r.gaps }}</span>
              </div>
            }
          </div>
        }
      </section>
    }

    <!-- Browse -->
    <section class="wrap mt-24">
      <div class="flex items-end justify-between gap-4">
        <div>
          <p class="eyebrow">Browse</p>
          <h2 class="mt-2 text-3xl font-semibold tracking-tight">Every kind of model</h2>
        </div>
        <a routerLink="/tasks" class="hidden items-center gap-1 text-sm text-muted hover:text-ink sm:flex">All tasks <svg lucideArrowRight [size]="14" /></a>
      </div>
      <div class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        @for (d of api.meta()?.domains ?? []; track d.id) {
          <div class="card p-5">
            <div class="flex items-center gap-3">
              <span class="grid size-10 place-items-center rounded-xl {{ tone(d.id) }}"><svg [lucideIcon]="domainIcon(d.id)" [size]="19" [strokeWidth]="1.75" /></span>
              <div>
                <h3 class="font-semibold tracking-tight">{{ d.name }}</h3>
                <p class="num text-xs text-faint">{{ total(d.id) }} models</p>
              </div>
            </div>
            <ul class="mt-4 flex flex-col">
              @for (t of d.tasks; track t.id) {
                <li>
                  <a [routerLink]="['/t', t.id]" class="group -mx-2 flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition hover:bg-subtle" [class.opacity-50]="!t.count">
                    <svg [lucideIcon]="taskIcon(t.id)" [size]="15" class="text-faint group-hover:text-ink" />
                    <span class="flex-1 text-muted group-hover:text-ink">{{ t.name }}</span>
                    @if (t.ranked) { <span class="chip chip-accent !px-1.5 !text-[10px]">Top picks</span> }
                    <span class="num w-5 text-right text-xs text-faint">{{ t.count }}</span>
                  </a>
                </li>
              }
            </ul>
          </div>
        }
      </div>
    </section>

    <!-- Replaced -->
    @if (replaced().length) {
      <section class="wrap mt-24">
        <p class="eyebrow">Keeping up</p>
        <h2 class="mt-2 text-3xl font-semibold tracking-tight">Newer and more efficient</h2>
        <p class="mt-2 max-w-xl text-muted">Models that something better has replaced, and what to use instead.</p>
        <div class="mt-6 grid gap-3 md:grid-cols-2">
          @for (p of replaced(); track p.old.id + p.next.id) {
            <a [routerLink]="['/m', p.next.id]" class="card card-hover group flex items-center gap-4 p-4">
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm text-faint line-through decoration-line-strong">{{ p.old.name }}</p>
                <p class="mt-0.5 flex items-center gap-2 truncate font-semibold tracking-tight"><svg lucideMoveRight [size]="16" class="shrink-0 text-accent" />{{ p.next.name }}</p>
              </div>
              <div class="flex shrink-0 flex-wrap justify-end gap-1">
                @for (a of p.aspects; track a) { <span class="chip chip-new"><svg [lucideIcon]="aspectIcon(a)" [size]="12" />{{ aspectName(a) }}</span> }
              </div>
            </a>
          }
        </div>
      </section>
    }

    <!-- Newest -->
    <section class="wrap mt-24">
      <div class="flex items-end justify-between gap-4">
        <div>
          <p class="eyebrow">Fresh</p>
          <h2 class="mt-2 text-3xl font-semibold tracking-tight">Newest in the index</h2>
        </div>
        <a routerLink="/models" class="hidden items-center gap-1 text-sm text-muted hover:text-ink sm:flex">All models <svg lucideArrowRight [size]="14" /></a>
      </div>
      <div class="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        @for (m of newest(); track m.id) { <app-model-card [id]="m.id" /> }
      </div>
    </section>
  `,
})
export class HomePage implements OnDestroy {
  protected readonly api = inject(Api);
  protected readonly state = inject(SearchState);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly box = viewChild.required<ElementRef<HTMLTextAreaElement>>('box');
  protected readonly examples = EXAMPLES;
  protected readonly steps = STEPS;
  protected readonly step = signal(0);
  protected readonly aspectName = aspectName;
  private timer?: ReturnType<typeof setInterval>;

  protected readonly updated = computed(() => {
    const d = (this.api.models() ?? []).map(m => m.released).filter(Boolean).sort().at(-1);
    return d ? date(d) : '';
  });
  protected readonly newest = computed(() =>
    [...(this.api.models() ?? [])].filter(m => m.released).sort((a, b) => b.released!.localeCompare(a.released!)).slice(0, 6));
  protected readonly replaced = computed(() => {
    const byId = this.api.modelById();
    return (this.api.models() ?? []).flatMap(m => m.better.slice(0, 1).map(b => ({ old: m, next: byId.get(b.id)!, aspects: b.aspects.slice(0, 2) })));
  });

  constructor() {
    const q = this.route.snapshot.queryParamMap.get('q');
    if (q) this.state.run(q);
    effect(() => {
      clearInterval(this.timer);
      if (this.state.busy()) {
        this.step.set(0);
        this.timer = setInterval(() => this.step.update(s => Math.min(s + 1, STEPS.length - 1)), 2600);
      }
    });
    effect(() => {
      if (this.state.result()) queueMicrotask(() => document.getElementById('results')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    });
  }

  ngOnDestroy() {
    clearInterval(this.timer);
  }

  protected submit(e?: Event) {
    e?.preventDefault();
    const q = this.box().nativeElement.value.trim();
    if (q.length < 3) return;
    this.router.navigate([], { queryParams: { q }, replaceUrl: true });
    this.state.run(q);
  }

  protected enter(e: Event) {
    const k = e as KeyboardEvent;
    if (k.shiftKey) return;
    e.preventDefault();
    this.submit();
  }

  protected example(text: string) {
    this.box().nativeElement.value = text;
    this.submit();
  }

  protected reset() {
    this.state.clear();
    this.box().nativeElement.value = '';
    this.router.navigate([], { queryParams: {}, replaceUrl: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.box().nativeElement.focus();
  }

  protected autosize() {
    const el = this.box().nativeElement;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }

  protected tone = (d: string) => DOMAIN_TONE[d];
  protected domainIcon = (d: string) => DOMAIN_ICON[d];
  protected taskIcon = (t: string) => TASK_ICON[t];
  protected aspectIcon = (a: string) => ASPECT_ICON[a];
  protected total = (d: string) => (this.api.models() ?? []).filter(m => m.domains.includes(d)).length;
}

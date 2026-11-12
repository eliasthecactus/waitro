import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideArrowUpRight, LucideDynamicIcon, LucideSearch, LucideStar, LucideX } from '@lucide/angular';
import { Api } from '../core/api';
import { compact } from '../core/format';
import { AGENT_KIND, SURFACE, fromPrice, surfaceIcon, surfaceName } from '../core/tools';
import { AgentSummary } from '../core/types';

@Component({
  selector: 'app-agents',
  imports: [RouterLink, LucideDynamicIcon, LucideSearch, LucideX, LucideStar, LucideArrowUpRight],
  template: `
    <div class="relative -mt-15 pt-15">
      <div class="hero-glow pointer-events-none absolute inset-x-0 top-0 -z-10 h-80 opacity-60"></div>
      <div class="wrap pt-10 sm:pt-14">
        <p class="eyebrow">Index</p>
        <div class="mt-2 flex flex-wrap items-end justify-between gap-3">
          <h1 class="text-4xl font-semibold tracking-tight">Agents</h1>
          <p class="num text-sm text-muted">{{ rows().length }} of {{ all().length }}</p>
        </div>
        <p class="mt-2 max-w-2xl text-muted">The tools that put models to work: coding agents in your terminal or editor, personal agents you message from your phone, and apps that run several agents at once. Each one shows how you pay and which providers it works with.</p>

        <div class="mt-6 grid gap-3 sm:grid-cols-3">
          @for (k of kinds; track k[0]) {
            <button type="button" (click)="kind.set(kind() === k[0] ? '' : k[0])"
                    class="card flex items-center gap-3 p-4 text-left transition hover:border-line-strong"
                    [class.!border-accent]="kind() === k[0]" [attr.aria-pressed]="kind() === k[0]">
              <span class="grid size-10 shrink-0 place-items-center rounded-xl {{ k[1].tone }}"><svg [lucideIcon]="k[1].icon" [size]="19" [strokeWidth]="1.75" /></span>
              <span class="min-w-0">
                <span class="flex items-center gap-2 font-medium">{{ k[1].name }}s <span class="num text-xs text-faint">{{ count(k[0]) }}</span></span>
                <span class="block text-xs leading-snug text-muted">{{ k[1].long }}</span>
              </span>
            </button>
          }
        </div>

        <div class="sticky top-15 z-30 -mx-4 mt-5 border-y border-line bg-bg/95 px-4 py-3 backdrop-blur-xl sm:mx-0 sm:rounded-2xl sm:border sm:px-3">
          <div class="flex flex-wrap items-center gap-2">
            <label class="relative min-w-0 flex-[1_1_100%] sm:flex-[1_1_220px]">
              <svg lucideSearch [size]="16" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
              <input type="search" class="field w-full !pl-9" placeholder="Filter by name, maker, tag…" [value]="q()" (input)="q.set($any($event.target).value)" aria-label="Filter" />
            </label>
            <select class="field min-w-0 flex-1 sm:flex-none" [value]="surface()" (change)="surface.set($any($event.target).value)" aria-label="Where it runs">
              <option value="">Runs anywhere</option>
              @for (s of surfaces; track s) { <option [value]="s" [selected]="s === surface()">{{ surfaceName(s) }}</option> }
            </select>
            <label class="flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-line bg-surface px-3 text-sm text-muted">
              <input type="checkbox" class="accent-[var(--accent)]" [checked]="open()" (change)="open.set($any($event.target).checked)" />Open source
            </label>
            <label class="flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-line bg-surface px-3 text-sm text-muted">
              <input type="checkbox" class="accent-[var(--accent)]" [checked]="free()" (change)="free.set($any($event.target).checked)" />Free to use
            </label>
            @if (filtered()) {
              <button type="button" class="flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-muted hover:text-ink" (click)="clear()"><svg lucideX [size]="14" />Clear</button>
            }
          </div>
        </div>

        <div class="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          @for (a of rows(); track a.id) {
            <a [routerLink]="['/a', a.id]" class="card card-hover group flex flex-col p-5">
              <div class="flex items-start gap-3">
                <span class="grid size-10 shrink-0 place-items-center rounded-xl {{ kindInfo(a.kind).tone }}"><svg [lucideIcon]="kindInfo(a.kind).icon" [size]="19" [strokeWidth]="1.75" /></span>
                <div class="min-w-0 flex-1">
                  <p class="truncate text-lg font-semibold leading-tight tracking-tight group-hover:text-accent-ink">{{ a.name }}</p>
                  <p class="truncate text-xs text-muted">{{ a.org }}</p>
                </div>
                <svg lucideArrowUpRight [size]="16" class="shrink-0 text-faint transition group-hover:text-ink" />
              </div>
              <p class="mt-3 line-clamp-3 text-sm leading-relaxed text-muted">{{ a.summary }}</p>
              <div class="mb-4 mt-4 flex flex-wrap gap-1">
                @for (s of a.surfaces; track s) {
                  <span class="grid size-7 place-items-center rounded-lg bg-subtle text-muted" [title]="surfaceName(s)"><svg [lucideIcon]="surfaceIcon(s)" [size]="14" /></span>
                }
              </div>
              <div class="mt-auto flex flex-wrap items-center gap-1.5 border-t border-line pt-3">
                @if (a.openSource) { <span class="chip chip-good">{{ a.license }}</span> } @else { <span class="chip">Closed source</span> }
                <span class="chip" [class.chip-accent]="a.pricing.free">{{ priceLabel(a) }}</span>
                @if (a.stats?.stars) { <span class="num ml-auto flex items-center gap-1 text-xs text-muted"><svg lucideStar [size]="12" />{{ compact(a.stats!.stars!) }}</span> }
              </div>
            </a>
          } @empty {
            <p class="col-span-full py-16 text-center text-muted">No agent matches these filters.</p>
          }
        </div>
      </div>
    </div>
  `,
})
export class AgentsPage {
  protected readonly api = inject(Api);
  protected readonly all = signal<AgentSummary[]>([]);
  protected readonly q = signal('');
  protected readonly kind = signal('');
  protected readonly surface = signal('');
  protected readonly open = signal(false);
  protected readonly free = signal(false);
  protected readonly kinds = Object.entries(AGENT_KIND);
  protected readonly surfaces = Object.keys(SURFACE);
  protected readonly surfaceName = surfaceName;
  protected readonly surfaceIcon = surfaceIcon;
  protected readonly compact = compact;

  constructor() {
    this.api.agents().then(a => this.all.set(a));
  }

  protected readonly filtered = computed(() => Boolean(this.q() || this.kind() || this.surface() || this.open() || this.free()));
  protected readonly rows = computed(() => {
    const q = this.q().trim().toLowerCase();
    return this.all()
      .filter(a => !this.kind() || a.kind === this.kind())
      .filter(a => !this.surface() || a.surfaces.includes(this.surface()))
      .filter(a => !this.open() || a.openSource)
      .filter(a => !this.free() || a.pricing.free)
      .filter(a => !q || [a.name, a.org, a.summary, ...a.tags].join(' ').toLowerCase().includes(q))
      .sort((x, y) => (y.stats?.stars ?? 0) - (x.stats?.stars ?? 0) || x.name.localeCompare(y.name));
  });

  protected count = (k: string) => this.all().filter(a => a.kind === k).length;
  protected kindInfo = (k: string) => AGENT_KIND[k] ?? AGENT_KIND['coding'];
  protected priceLabel = (a: AgentSummary) => (a.pricing.free ? (a.pricing.from ? `Free · paid ${fromPrice(a.pricing.from)}` : 'Free') : fromPrice(a.pricing.from) || 'Paid');
  protected clear() {
    this.q.set(''); this.kind.set(''); this.surface.set(''); this.open.set(false); this.free.set(false);
  }
}

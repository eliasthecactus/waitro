import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import {
  LucideArrowLeft, LucideArrowUpRight, LucideCheck, LucideCircleCheck, LucideCircleMinus, LucideClock, LucideCopy, LucideDynamicIcon,
  LucideExternalLink, LucideInfo, LucidePencil,
} from '@lucide/angular';
import { Api } from '../core/api';
import { compact, date, linkName } from '../core/format';
import { LINK_ICON } from '../core/icons';
import { AGENT_KIND, PROVIDER_KIND, osName, planPrice, surfaceIcon, surfaceName } from '../core/tools';
import { AgentDetail } from '../core/types';

@Component({
  selector: 'app-agent',
  imports: [
    RouterLink, LucideDynamicIcon, LucideArrowLeft, LucideArrowUpRight, LucideCircleCheck, LucideCircleMinus, LucideClock,
    LucideExternalLink, LucideInfo, LucidePencil,
  ],
  template: `
    @if (error()) {
      <div class="wrap pt-24 text-center">
        <h1 class="text-3xl font-semibold tracking-tight">Agent not found</h1>
        <p class="mt-2 text-muted">{{ error() }}</p>
        <a routerLink="/agents" class="btn btn-ghost mt-6"><svg lucideArrowLeft [size]="15" />All agents</a>
      </div>
    } @else if (a(); as a) {
      <div class="relative -mt-15 pt-15">
        <div class="hero-glow pointer-events-none absolute inset-x-0 top-0 -z-10 h-96 opacity-70"></div>
        <div class="wrap pt-8 sm:pt-10">
          <nav class="flex items-center gap-1.5 text-sm text-muted">
            <a routerLink="/agents" class="flex items-center gap-1 hover:text-ink"><svg lucideArrowLeft [size]="14" />Agents</a>
            <span class="text-faint">/</span><span>{{ kind().name }}s</span>
          </nav>

          <header class="mt-6 flex flex-col gap-5 sm:flex-row sm:items-start">
            <span class="grid size-14 shrink-0 place-items-center rounded-2xl {{ kind().tone }}"><svg [lucideIcon]="kind().icon" [size]="26" [strokeWidth]="1.75" /></span>
            <div class="min-w-0 flex-1">
              <h1 class="text-3xl font-semibold tracking-[-0.03em] sm:text-5xl">{{ a.name }}</h1>
              <p class="mt-2 text-muted">{{ a.org }}<span class="text-faint"> · </span>{{ kind().name }}@if (a.version) {<span class="text-faint"> · </span><span class="num">{{ a.version }}</span>}</p>
              <p class="mt-4 max-w-3xl text-lg leading-relaxed">{{ a.summary }}</p>
              <div class="mt-6 flex flex-wrap gap-2">
                @for (l of links(); track l[0]) {
                  <a [href]="l[1]" target="_blank" rel="noopener" class="btn btn-ghost !py-2"><svg [lucideIcon]="linkIcon(l[0])" [size]="15" />{{ linkName(l[0]) }}<svg lucideArrowUpRight [size]="13" class="text-faint" /></a>
                }
              </div>
            </div>
          </header>

          <section class="mt-10 grid grid-cols-2 overflow-hidden rounded-2xl border border-line bg-surface sm:grid-cols-3 lg:grid-cols-5">
            @for (f of facts(); track f.label) {
              <div class="flex flex-col gap-1 p-4 shadow-[-1px_-1px_0_var(--line)]">
                <span class="eyebrow !text-[10px]">{{ f.label }}</span>
                <span class="text-lg font-semibold leading-tight tracking-tight" [class]="f.cls ?? ''">{{ f.value }}</span>
                @if (f.sub) { <span class="text-xs text-muted">{{ f.sub }}</span> }
              </div>
            }
          </section>

          <div class="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div class="flex min-w-0 flex-col gap-10">
              @if (a.description) {
                <section>
                  <h2 class="text-xl font-semibold tracking-tight">About</h2>
                  <p class="mt-3 max-w-3xl leading-relaxed text-muted">{{ a.description }}</p>
                </section>
              }

              <section>
                <h2 class="text-xl font-semibold tracking-tight">How you pay</h2>
                <p class="mt-2 max-w-3xl text-muted">{{ a.pricing.summary }}</p>
                @if (a.pricing.plans?.length) {
                  <div class="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    @for (p of a.pricing.plans; track p.name) {
                      <div class="rounded-xl border border-line bg-surface p-4">
                        <p class="text-sm font-medium text-muted">{{ p.name }}</p>
                        @if (planPrice(p)) {
                          <p class="num mt-1 text-2xl font-semibold tracking-tight">{{ planPrice(p) }}</p>
                          @if (p.note) { <p class="mt-1 text-sm leading-snug text-muted">{{ p.note }}</p> }
                        } @else {
                          <p class="mt-1.5 font-medium leading-snug">{{ p.note || 'Price not listed' }}</p>
                        }
                      </div>
                    }
                  </div>
                }
                @if (a.pricing.source) { <a [href]="a.pricing.source" target="_blank" rel="noopener" class="mt-3 inline-flex items-center gap-1 text-sm text-accent-ink hover:underline">Pricing source<svg lucideExternalLink [size]="12" /></a> }
              </section>

              <section>
                <h2 class="text-xl font-semibold tracking-tight">Models</h2>
                <p class="mt-2 max-w-3xl text-muted">{{ a.models }}</p>
                @if (a.builtFor.length) {
                  <div class="mt-4 flex flex-wrap gap-2">
                    @for (m of a.builtFor; track m.id) {
                      <a [routerLink]="['/m', m.id]" class="chip !px-3 !py-1.5 !text-sm transition hover:border-line-strong hover:text-ink">{{ m.name }}<svg lucideArrowUpRight [size]="12" /></a>
                    }
                  </div>
                }
              </section>

              @if (a.providers.length) {
                <section>
                  <h2 class="text-xl font-semibold tracking-tight">Providers that work with it</h2>
                  <p class="mt-1 text-sm text-muted">Confirmed by the provider's or the agent's own docs.</p>
                  <div class="mt-4 grid gap-3 sm:grid-cols-2">
                    @for (p of a.providers; track p.id) {
                      <a [routerLink]="['/p', p.id]" class="group flex items-start gap-3 rounded-xl border border-line bg-surface p-4 transition hover:border-line-strong">
                        <span class="grid size-9 shrink-0 place-items-center rounded-xl {{ providerKind(p.kind).tone }}"><svg [lucideIcon]="providerKind(p.kind).icon" [size]="17" /></span>
                        <span class="min-w-0">
                          <span class="block font-medium group-hover:text-accent-ink">{{ p.name }}</span>
                          <span class="block text-xs text-muted">{{ providerKind(p.kind).name }}</span>
                          <span class="mt-1 line-clamp-2 block text-sm text-muted">{{ p.summary }}</span>
                        </span>
                      </a>
                    }
                  </div>
                </section>
              }

              @if (a.wraps.length || a.wrappedBy.length) {
                <section>
                  <h2 class="text-xl font-semibold tracking-tight">{{ a.wraps.length ? 'Agents it runs' : 'Also runs inside' }}</h2>
                  <div class="mt-4 flex flex-wrap gap-2">
                    @for (x of a.wraps.length ? a.wraps : a.wrappedBy; track x.id) {
                      <a [routerLink]="['/a', x.id]" class="chip !px-3 !py-1.5 !text-sm transition hover:border-line-strong hover:text-ink">{{ x.name }}<svg lucideArrowUpRight [size]="12" /></a>
                    }
                  </div>
                </section>
              }

              @if (a.strengths?.length || a.limitations?.length) {
                <section class="grid gap-4 sm:grid-cols-2">
                  @if (a.strengths?.length) {
                    <div class="card p-5">
                      <h3 class="text-sm font-semibold">Good at</h3>
                      <ul class="mt-3 flex flex-col gap-2.5">
                        @for (s of a.strengths; track s) { <li class="flex gap-2.5 text-sm leading-snug"><svg lucideCircleCheck [size]="16" class="mt-px shrink-0 text-emerald-500" />{{ s }}</li> }
                      </ul>
                    </div>
                  }
                  @if (a.limitations?.length) {
                    <div class="card p-5">
                      <h3 class="text-sm font-semibold">Watch out for</h3>
                      <ul class="mt-3 flex flex-col gap-2.5">
                        @for (s of a.limitations; track s) { <li class="flex gap-2.5 text-sm leading-snug"><svg lucideCircleMinus [size]="16" class="mt-px shrink-0 text-amber-500" />{{ s }}</li> }
                      </ul>
                    </div>
                  }
                </section>
              }

              @if (a.features?.length) {
                <section>
                  <h2 class="text-xl font-semibold tracking-tight">Features</h2>
                  <div class="mt-4 flex flex-wrap gap-2">@for (f of a.features; track f) { <span class="chip !px-3 !py-1 !text-sm">{{ f }}</span> }</div>
                </section>
              }
            </div>

            <aside class="flex flex-col gap-4 lg:sticky lg:top-20 lg:self-start">
              @if (a.install?.length) {
                <div class="card p-5">
                  <h3 class="text-sm font-semibold">Install</h3>
                  <div class="mt-3 flex flex-col gap-3">
                    @for (i of a.install; track i.cmd) {
                      <div>
                        @if (i.label) { <p class="mb-1 text-xs text-muted">{{ i.label }}</p> }
                        <div class="group relative rounded-lg bg-sunken">
                          <code class="block whitespace-pre-wrap break-all py-2 pl-3 pr-9 font-mono text-[12px] leading-relaxed">{{ i.cmd }}</code>
                          <button type="button" (click)="copy(i.cmd)" class="absolute right-1 top-1 grid size-7 place-items-center rounded-md text-faint transition hover:bg-subtle hover:text-ink" [attr.aria-label]="'Copy ' + i.cmd">
                            <svg [lucideIcon]="copied() === i.cmd ? checkIcon : copyIcon" [size]="13" />
                          </button>
                        </div>
                      </div>
                    }
                  </div>
                </div>
              }
              <div class="card p-5">
                <h3 class="text-sm font-semibold">Where it runs</h3>
                <div class="mt-3 flex flex-wrap gap-1.5">
                  @for (s of a.surfaces; track s) { <span class="chip"><svg [lucideIcon]="surfaceIcon(s)" [size]="12" />{{ surfaceName(s) }}</span> }
                </div>
                <h3 class="mt-5 text-sm font-semibold">Systems</h3>
                <p class="mt-2 text-sm text-muted">{{ osList() }}</p>
              </div>
              <div class="flex flex-col gap-2 px-1 text-xs text-muted">
                <span class="flex items-center gap-1.5"><svg lucideClock [size]="13" />Checked {{ date(a.lastChecked, true) }}</span>
                @if (a.notes) { <span class="flex gap-1.5"><svg lucideInfo [size]="13" class="mt-px shrink-0" />{{ a.notes }}</span> }
                <a [href]="a.editUrl" target="_blank" rel="noopener" class="flex items-center gap-1.5 hover:text-ink"><svg lucidePencil [size]="13" />Suggest a change on GitHub</a>
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
export class AgentPage {
  protected readonly api = inject(Api);
  private readonly title = inject(Title);
  readonly id = input.required<string>();
  protected readonly a = signal<AgentDetail | null>(null);
  protected readonly error = signal('');
  protected readonly copied = signal('');
  protected readonly date = date;
  protected readonly linkName = linkName;
  protected readonly planPrice = planPrice;
  protected readonly surfaceName = surfaceName;
  protected readonly surfaceIcon = surfaceIcon;
  protected readonly copyIcon = LucideCopy;
  protected readonly checkIcon = LucideCheck;

  protected readonly kind = computed(() => AGENT_KIND[this.a()?.kind ?? 'coding'] ?? AGENT_KIND['coding']);
  protected readonly links = computed(() => Object.entries(this.a()?.links ?? {}));
  protected readonly osList = computed(() => (this.a()?.os ?? []).map(osName).join(', '));
  protected readonly facts = computed(() => {
    const a = this.a();
    if (!a) return [];
    const paid = (a.pricing.plans ?? []).filter(p => (p.price ?? 0) > 0).sort((x, y) => x.price! - y.price!)[0];
    const facts: { label: string; value: string; sub?: string; cls?: string }[] = [
      { label: 'Type', value: this.kind().name },
      a.openSource
        ? { label: 'Source', value: 'Open source', sub: a.license ?? undefined, cls: 'text-emerald-600 dark:text-emerald-400' }
        : { label: 'Source', value: 'Closed', sub: a.license ?? undefined },
      { label: 'Price', value: a.pricing.free ? 'Free' : paid ? planPrice(paid) : 'Paid', sub: a.pricing.free ? (paid ? `paid plans from ${planPrice(paid)}` : 'pay your model provider') : paid ? 'cheapest plan' : undefined },
      { label: 'Runs in', value: `${a.surfaces.length} ${a.surfaces.length === 1 ? 'place' : 'places'}`, sub: a.surfaces.map(surfaceName).slice(0, 3).join(', ') },
    ];
    if (a.stats?.stars) facts.push({ label: 'GitHub stars', value: compact(a.stats.stars) });
    else facts.push({ label: 'Providers', value: String(a.providers.length), sub: 'confirmed to work' });
    return facts;
  });

  constructor() {
    effect(() => {
      const id = this.id();
      this.a.set(null);
      this.error.set('');
      this.api.agent(id).then(
        a => { this.a.set(a); this.title.setTitle(`${a.name} · Waitro`); },
        e => this.error.set(e.status === 404 ? 'This agent is not in the index.' : e.message),
      );
    });
  }

  protected providerKind = (k: string) => PROVIDER_KIND[k] ?? PROVIDER_KIND['router'];
  protected linkIcon = (k: string) => LINK_ICON[k] ?? LINK_ICON['homepage'];
  protected copy(cmd: string) {
    navigator.clipboard?.writeText(cmd).then(() => {
      this.copied.set(cmd);
      setTimeout(() => this.copied() === cmd && this.copied.set(''), 1500);
    }).catch(() => {});
  }
}

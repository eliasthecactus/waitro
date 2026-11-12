import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import {
  LucideArrowLeft, LucideArrowUpRight, LucideCircleCheck, LucideCircleMinus, LucideClock, LucideDynamicIcon, LucideExternalLink,
  LucideInfo, LucidePencil, LucideShieldCheck,
} from '@lucide/angular';
import { Api } from '../core/api';
import { date, linkName } from '../core/format';
import { LINK_ICON } from '../core/icons';
import { AGENT_KIND, PROVIDER_KIND, apiName, billingIcon, billingName, perM, planPrice } from '../core/tools';
import { ProviderDetail } from '../core/types';

@Component({
  selector: 'app-provider',
  imports: [
    RouterLink, LucideDynamicIcon, LucideArrowLeft, LucideArrowUpRight, LucideCircleCheck, LucideCircleMinus, LucideClock, LucideExternalLink,
    LucideInfo, LucidePencil, LucideShieldCheck,
  ],
  template: `
    @if (error()) {
      <div class="wrap pt-24 text-center">
        <h1 class="text-3xl font-semibold tracking-tight">Provider not found</h1>
        <p class="mt-2 text-muted">{{ error() }}</p>
        <a routerLink="/providers" class="btn btn-ghost mt-6"><svg lucideArrowLeft [size]="15" />All providers</a>
      </div>
    } @else if (p(); as p) {
      <div class="relative -mt-15 pt-15">
        <div class="hero-glow pointer-events-none absolute inset-x-0 top-0 -z-10 h-96 opacity-70"></div>
        <div class="wrap pt-8 sm:pt-10">
          <nav class="flex items-center gap-1.5 text-sm text-muted">
            <a routerLink="/providers" class="flex items-center gap-1 hover:text-ink"><svg lucideArrowLeft [size]="14" />Providers</a>
            <span class="text-faint">/</span><span>{{ kind().name }}s</span>
          </nav>

          <header class="mt-6 flex flex-col gap-5 sm:flex-row sm:items-start">
            <span class="grid size-14 shrink-0 place-items-center rounded-2xl {{ kind().tone }}"><svg [lucideIcon]="kind().icon" [size]="26" [strokeWidth]="1.75" /></span>
            <div class="min-w-0 flex-1">
              <h1 class="text-3xl font-semibold tracking-[-0.03em] sm:text-5xl">{{ p.name }}</h1>
              <p class="mt-2 text-muted">{{ p.org }}<span class="text-faint"> · </span>{{ kind().name }}@if (p.hq) {<span class="text-faint"> · </span>{{ p.hq }}}</p>
              <p class="mt-4 max-w-3xl text-lg leading-relaxed">{{ p.summary }}</p>
              <div class="mt-6 flex flex-wrap gap-2">
                @for (l of links(); track l[0]) {
                  <a [href]="l[1]" target="_blank" rel="noopener" class="btn btn-ghost !py-2"><svg [lucideIcon]="linkIcon(l[0])" [size]="15" />{{ linkName(l[0]) }}<svg lucideArrowUpRight [size]="13" class="text-faint" /></a>
                }
              </div>
            </div>
          </header>

          <section class="mt-10 grid grid-cols-2 overflow-hidden rounded-2xl border border-line bg-surface sm:grid-cols-4">
            @for (f of facts(); track f.label) {
              <div class="flex flex-col gap-1 p-4 shadow-[-1px_-1px_0_var(--line)]">
                <span class="eyebrow !text-[10px]">{{ f.label }}</span>
                <span class="text-lg font-semibold leading-tight tracking-tight">{{ f.value }}</span>
                @if (f.sub) { <span class="text-xs leading-snug text-muted">{{ f.sub }}</span> }
              </div>
            }
          </section>

          <div class="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div class="flex min-w-0 flex-col gap-10">
              <section>
                <h2 class="text-xl font-semibold tracking-tight">How it works</h2>
                @for (para of paragraphs(); track $index) { <p class="mt-3 max-w-3xl leading-relaxed text-muted">{{ para }}</p> }
              </section>

              @if (p.plans?.length) {
                <section>
                  <h2 class="text-xl font-semibold tracking-tight">Plans</h2>
                  <div class="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    @for (x of p.plans; track x.name) {
                      <div class="rounded-xl border border-line bg-surface p-4">
                        <p class="text-sm font-medium text-muted">{{ x.name }}</p>
                        @if (planPrice(x)) {
                          <p class="num mt-1 text-2xl font-semibold tracking-tight">{{ planPrice(x) }}</p>
                          @if (x.note) { <p class="mt-1 text-sm leading-snug text-muted">{{ x.note }}</p> }
                        } @else {
                          <p class="mt-1.5 font-medium leading-snug">{{ x.note || 'Price not listed' }}</p>
                        }
                      </div>
                    }
                  </div>
                </section>
              }

              @if (p.models.length) {
                <section>
                  <div class="flex flex-wrap items-end justify-between gap-2">
                    <h2 class="text-xl font-semibold tracking-tight">{{ hasPrices() ? 'Model prices' : 'Models' }}</h2>
                    @if (p.modelCount && p.modelCount > p.models.length) { <span class="text-sm text-muted">A selection of <span class="num">{{ p.modelCount }}</span> models</span> }
                  </div>
                  @if (hasPrices()) { <p class="mt-1 text-sm text-muted">USD per 1M tokens.</p> }
                  <div class="card mt-4 overflow-x-auto">
                    <table class="w-full text-sm" [class.min-w-[560px]]="hasPrices()">
                      <thead>
                        <tr class="border-b border-line bg-subtle/60 text-left text-xs uppercase tracking-wider text-faint">
                          <th class="px-4 py-2.5 font-medium">Model</th>
                          @if (hasPrices()) {
                            <th class="px-3 py-2.5 text-right font-medium">Input</th>
                            <th class="px-3 py-2.5 text-right font-medium">Output</th>
                            <th class="px-3 py-2.5 text-right font-medium">Cached</th>
                          }
                          <th class="px-3 py-2.5 font-medium">Note</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (m of p.models; track m.name) {
                          <tr class="border-b border-line last:border-0">
                            <td class="py-2.5 pl-4 pr-3 font-medium">
                              @if (m.id) { <a [routerLink]="['/m', m.id]" class="inline-flex items-center gap-1 hover:text-accent-ink">{{ m.name }}<svg lucideArrowUpRight [size]="12" class="text-faint" /></a> } @else { {{ m.name }} }
                            </td>
                            @if (hasPrices()) {
                              <td class="num whitespace-nowrap px-3 py-2.5 text-right">{{ perM(m.inputPerM) || '–' }}</td>
                              <td class="num whitespace-nowrap px-3 py-2.5 text-right">{{ perM(m.outputPerM) || '–' }}</td>
                              <td class="num whitespace-nowrap px-3 py-2.5 text-right text-muted">{{ perM(m.cachedInputPerM) || '–' }}</td>
                            }
                            <td class="px-3 py-2.5 text-muted">{{ m.note }}</td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                  @if (p.pricesSource) { <a [href]="p.pricesSource" target="_blank" rel="noopener" class="mt-3 inline-flex items-center gap-1 text-sm text-accent-ink hover:underline">Price source<svg lucideExternalLink [size]="12" /></a> }
                </section>
              }

              @if (p.worksWith.length) {
                <section>
                  <h2 class="text-xl font-semibold tracking-tight">Works with these agents</h2>
                  <div class="mt-4 grid gap-3 sm:grid-cols-2">
                    @for (a of p.worksWith; track a.id) {
                      <a [routerLink]="['/a', a.id]" class="group flex items-start gap-3 rounded-xl border border-line bg-surface p-4 transition hover:border-line-strong">
                        <span class="grid size-9 shrink-0 place-items-center rounded-xl {{ agentKind(a.kind).tone }}"><svg [lucideIcon]="agentKind(a.kind).icon" [size]="17" /></span>
                        <span class="min-w-0">
                          <span class="block font-medium group-hover:text-accent-ink">{{ a.name }}</span>
                          <span class="mt-0.5 line-clamp-2 block text-sm text-muted">{{ a.summary }}</span>
                        </span>
                      </a>
                    }
                  </div>
                </section>
              }

              @if (p.strengths?.length || p.limitations?.length) {
                <section class="grid gap-4 sm:grid-cols-2">
                  @if (p.strengths?.length) {
                    <div class="card p-5">
                      <h3 class="text-sm font-semibold">Good at</h3>
                      <ul class="mt-3 flex flex-col gap-2.5">
                        @for (s of p.strengths; track s) { <li class="flex gap-2.5 text-sm leading-snug"><svg lucideCircleCheck [size]="16" class="mt-px shrink-0 text-emerald-500" />{{ s }}</li> }
                      </ul>
                    </div>
                  }
                  @if (p.limitations?.length) {
                    <div class="card p-5">
                      <h3 class="text-sm font-semibold">Watch out for</h3>
                      <ul class="mt-3 flex flex-col gap-2.5">
                        @for (s of p.limitations; track s) { <li class="flex gap-2.5 text-sm leading-snug"><svg lucideCircleMinus [size]="16" class="mt-px shrink-0 text-amber-500" />{{ s }}</li> }
                      </ul>
                    </div>
                  }
                </section>
              }
            </div>

            <aside class="flex flex-col gap-4 lg:sticky lg:top-20 lg:self-start">
              <div class="card p-5">
                <h3 class="text-sm font-semibold">Billing</h3>
                <div class="mt-3 flex flex-wrap gap-1.5">
                  @for (b of p.billing.types; track b) { <span class="chip"><svg [lucideIcon]="billingIcon(b)" [size]="12" />{{ billingName(b) }}</span> }
                </div>
                <dl class="mt-3 flex flex-col divide-y divide-line text-sm">
                  @if (p.billing.fee) { <div class="py-2"><dt class="text-xs text-muted">Fees</dt><dd class="mt-0.5">{{ p.billing.fee }}</dd></div> }
                  @if (p.billing.freeTier) { <div class="py-2"><dt class="text-xs text-muted">Free tier</dt><dd class="mt-0.5">{{ p.billing.freeTier }}</dd></div> }
                  @if (p.billing.note) { <div class="py-2"><dt class="text-xs text-muted">Good to know</dt><dd class="mt-0.5">{{ p.billing.note }}</dd></div> }
                </dl>
                <h3 class="mt-4 text-sm font-semibold">API</h3>
                <div class="mt-2 flex flex-wrap gap-1.5">@for (x of p.api; track x) { <span class="chip">{{ apiName(x) }}</span> }</div>
                @if (p.baseUrl) { <code class="mt-3 block overflow-x-auto whitespace-nowrap rounded-lg bg-sunken px-3 py-2 font-mono text-[12px]">{{ p.baseUrl }}</code> }
              </div>
              @if (p.privacy) {
                <div class="card p-5">
                  <h3 class="flex items-center gap-2 text-sm font-semibold"><svg lucideShieldCheck [size]="15" class="text-emerald-500" />Privacy</h3>
                  <p class="mt-2 text-sm leading-relaxed text-muted">{{ p.privacy }}</p>
                </div>
              }
              <div class="flex flex-col gap-2 px-1 text-xs text-muted">
                <span class="flex items-center gap-1.5"><svg lucideClock [size]="13" />Checked {{ date(p.lastChecked, true) }}</span>
                @if (p.notes) { <span class="flex gap-1.5"><svg lucideInfo [size]="13" class="mt-px shrink-0" />{{ p.notes }}</span> }
                <a [href]="p.editUrl" target="_blank" rel="noopener" class="flex items-center gap-1.5 hover:text-ink"><svg lucidePencil [size]="13" />Suggest a change on GitHub</a>
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
export class ProviderPage {
  protected readonly api = inject(Api);
  private readonly title = inject(Title);
  readonly id = input.required<string>();
  protected readonly p = signal<ProviderDetail | null>(null);
  protected readonly error = signal('');
  protected readonly date = date;
  protected readonly linkName = linkName;
  protected readonly planPrice = planPrice;
  protected readonly perM = perM;
  protected readonly apiName = apiName;
  protected readonly billingName = billingName;
  protected readonly billingIcon = billingIcon;

  protected readonly kind = computed(() => PROVIDER_KIND[this.p()?.kind ?? 'router'] ?? PROVIDER_KIND['router']);
  protected readonly links = computed(() => Object.entries(this.p()?.links ?? {}));
  protected readonly paragraphs = computed(() => (this.p()?.description ?? '').trim().split(/\n\s*\n/).map(x => x.replace(/\s+/g, ' ')));
  protected readonly hasPrices = computed(() => (this.p()?.models ?? []).some(m => m.inputPerM !== undefined));
  protected readonly facts = computed(() => {
    const p = this.p();
    if (!p) return [];
    const paid = (p.plans ?? []).filter(x => (x.price ?? 0) > 0).sort((a, b) => a.price! - b.price!)[0];
    const cheapest = p.models.filter(m => m.inputPerM !== undefined).sort((a, b) => a.inputPerM! - b.inputPerM!)[0];
    return [
      { label: 'Type', value: this.kind().name, sub: this.kind().long },
      { label: 'Billing', value: p.billing.types.map(billingName).join(' + ') },
      paid ? { label: 'Plans from', value: planPrice(paid), sub: paid.name }
        : cheapest ? { label: 'Cheapest listed', value: `${perM(cheapest.inputPerM)} in`, sub: cheapest.name }
          : p.plans?.length ? { label: 'Plans', value: `${p.plans.length} plans`, sub: p.plans.map(x => x.name).join(', ') }
            : { label: 'Plans', value: 'Pay as you go' },
      { label: 'Models', value: String(p.modelCount ?? p.models.length), sub: p.modelCount ? 'in total' : 'listed here' },
    ];
  });

  constructor() {
    effect(() => {
      const id = this.id();
      this.p.set(null);
      this.error.set('');
      this.api.provider(id).then(
        p => { this.p.set(p); this.title.setTitle(`${p.name} · Waitro`); },
        e => this.error.set(e.status === 404 ? 'This provider is not in the index.' : e.message),
      );
    });
  }

  protected agentKind = (k: string) => AGENT_KIND[k] ?? AGENT_KIND['coding'];
  protected linkIcon = (k: string) => LINK_ICON[k] ?? LINK_ICON['homepage'];
}

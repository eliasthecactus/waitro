import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { LucideArrowUpRight, LucideDynamicIcon, LucideLayoutGrid, LucideRows3, LucideSearch, LucideX } from '@lucide/angular';
import { Api } from '../core/api';
import { API_NAME, BILLING, PROVIDER_KIND, apiName, billingIcon, billingName, fromPrice } from '../core/tools';
import { ProviderSummary } from '../core/types';

@Component({
  selector: 'app-providers',
  imports: [RouterLink, LucideDynamicIcon, LucideSearch, LucideX, LucideArrowUpRight, LucideLayoutGrid, LucideRows3],
  template: `
    <div class="relative -mt-15 pt-15">
      <div class="hero-glow pointer-events-none absolute inset-x-0 top-0 -z-10 h-80 opacity-60"></div>
      <div class="wrap pt-10 sm:pt-14">
        <p class="eyebrow">Index</p>
        <div class="mt-2 flex flex-wrap items-end justify-between gap-3">
          <h1 class="text-4xl font-semibold tracking-tight">Providers</h1>
          <p class="num text-sm text-muted">{{ rows().length }} of {{ all().length }}</p>
        </div>
        <p class="mt-2 max-w-2xl text-muted">Where you get the models: routers that put many providers behind one key, clouds that run models on their own hardware, and monthly coding plans. Prices are per million tokens, taken from each provider's own pages.</p>

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
              <input type="search" class="field w-full !pl-9" placeholder="Filter by name, model, tag…" [value]="q()" (input)="q.set($any($event.target).value)" aria-label="Filter" />
            </label>
            <select class="field min-w-0 flex-1 sm:flex-none" [value]="billing()" (change)="billing.set($any($event.target).value)" aria-label="How you pay">
              <option value="">Any billing</option>
              @for (b of billings; track b) { <option [value]="b" [selected]="b === billing()">{{ billingName(b) }}</option> }
            </select>
            <select class="field min-w-0 flex-1 sm:flex-none" [value]="api()" (change)="api.set($any($event.target).value)" aria-label="API">
              <option value="">Any API</option>
              @for (x of apis; track x) { <option [value]="x" [selected]="x === api()">{{ apiName(x) }}</option> }
            </select>
            @if (filtered()) {
              <button type="button" class="flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-muted hover:text-ink" (click)="clear()"><svg lucideX [size]="14" />Clear</button>
            }
            <div class="ml-auto flex rounded-xl border border-line bg-surface p-0.5" role="group" aria-label="View">
              <button type="button" (click)="view.set('cards')" class="flex items-center gap-1.5 rounded-[10px] px-3 py-1.5 text-sm transition" [class]="view() === 'cards' ? 'bg-ink text-bg' : 'text-muted hover:text-ink'"><svg lucideLayoutGrid [size]="14" />Cards</button>
              <button type="button" (click)="view.set('table')" class="flex items-center gap-1.5 rounded-[10px] px-3 py-1.5 text-sm transition" [class]="view() === 'table' ? 'bg-ink text-bg' : 'text-muted hover:text-ink'"><svg lucideRows3 [size]="14" />Compare</button>
            </div>
          </div>
        </div>

        @if (view() === 'cards') {
          <div class="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            @for (p of rows(); track p.id) {
              <a [routerLink]="['/p', p.id]" class="card card-hover group flex flex-col p-5">
                <div class="flex items-start gap-3">
                  <span class="grid size-10 shrink-0 place-items-center rounded-xl {{ kindInfo(p.kind).tone }}"><svg [lucideIcon]="kindInfo(p.kind).icon" [size]="19" [strokeWidth]="1.75" /></span>
                  <div class="min-w-0 flex-1">
                    <p class="truncate text-lg font-semibold leading-tight tracking-tight group-hover:text-accent-ink">{{ p.name }}</p>
                    <p class="truncate text-xs text-muted">{{ kindInfo(p.kind).name }}@if (p.hq) { · {{ p.hq }} }</p>
                  </div>
                  <svg lucideArrowUpRight [size]="16" class="shrink-0 text-faint transition group-hover:text-ink" />
                </div>
                <p class="mt-3 line-clamp-3 text-sm leading-relaxed text-muted">{{ p.summary }}</p>
                <div class="mb-4 mt-4 flex flex-wrap gap-1.5">
                  @for (b of p.billing.types; track b) { <span class="chip"><svg [lucideIcon]="billingIcon(b)" [size]="12" />{{ billingName(b) }}</span> }
                </div>
                <div class="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line pt-3 text-xs text-muted">
                  @if (p.from) { <span class="num font-medium text-ink">{{ fromPrice(p.from) }}</span> }
                  @if (p.modelCount) { <span class="num">{{ p.modelCount }} {{ p.modelCount === 1 ? 'model' : 'models' }}</span> }
                  <span class="ml-auto truncate">{{ apiShort(p.api) }}</span>
                </div>
              </a>
            } @empty {
              <p class="col-span-full py-16 text-center text-muted">No provider matches these filters.</p>
            }
          </div>
        } @else {
          <div class="card mt-5 overflow-x-auto">
            <table class="w-full min-w-[980px] text-sm">
              <thead>
                <tr class="border-b border-line bg-subtle/60 text-left text-xs uppercase tracking-wider text-faint">
                  <th class="px-4 py-3 font-medium">Provider</th>
                  <th class="px-3 py-3 font-medium">How you pay</th>
                  <th class="px-3 py-3 font-medium">Plans</th>
                  <th class="px-3 py-3 font-medium">Fees</th>
                  <th class="px-3 py-3 font-medium">Free tier</th>
                  <th class="px-3 py-3 font-medium">APIs</th>
                </tr>
              </thead>
              <tbody>
                @for (p of rows(); track p.id) {
                  <tr class="cursor-pointer border-b border-line align-top transition last:border-0 hover:bg-subtle/60" (click)="go(p.id)">
                    <td class="py-3 pl-4 pr-3">
                      <a [routerLink]="['/p', p.id]" class="font-semibold tracking-tight hover:text-accent-ink" (click)="$event.stopPropagation()">{{ p.name }}</a>
                      <p class="text-xs text-muted">{{ kindInfo(p.kind).name }}</p>
                    </td>
                    <td class="px-3 py-3"><div class="flex flex-wrap gap-1">@for (b of p.billing.types; track b) { <span class="chip">{{ billingName(b) }}</span> }</div></td>
                    <td class="num whitespace-nowrap px-3 py-3">{{ p.from ? fromPrice(p.from) : '–' }}</td>
                    <td class="max-w-[15rem] px-3 py-3 text-muted">{{ p.billing.fee || '–' }}</td>
                    <td class="max-w-[17rem] px-3 py-3 text-muted">{{ p.billing.freeTier || '–' }}</td>
                    <td class="px-3 py-3 text-muted">{{ apiShort(p.api) }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    </div>
  `,
})
export class ProvidersPage {
  private readonly data = inject(Api);
  private readonly router = inject(Router);
  protected readonly all = signal<ProviderSummary[]>([]);
  protected readonly q = signal('');
  protected readonly kind = signal('');
  protected readonly billing = signal('');
  protected readonly api = signal('');
  protected readonly view = signal<'cards' | 'table'>('cards');
  protected readonly kinds = Object.entries(PROVIDER_KIND);
  protected readonly billings = Object.keys(BILLING);
  protected readonly apis = Object.keys(API_NAME);
  protected readonly billingName = billingName;
  protected readonly billingIcon = billingIcon;
  protected readonly apiName = apiName;
  protected readonly fromPrice = fromPrice;

  constructor() {
    this.data.providers().then(p => this.all.set(p));
  }

  protected readonly filtered = computed(() => Boolean(this.q() || this.kind() || this.billing() || this.api()));
  protected readonly rows = computed(() => {
    const q = this.q().trim().toLowerCase();
    const order = Object.keys(PROVIDER_KIND);
    return this.all()
      .filter(p => !this.kind() || p.kind === this.kind())
      .filter(p => !this.billing() || p.billing.types.includes(this.billing()))
      .filter(p => !this.api() || p.api.includes(this.api()))
      .filter(p => !q || [p.name, p.org, p.summary, ...p.tags].join(' ').toLowerCase().includes(q))
      .sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind) || a.name.localeCompare(b.name));
  });

  protected count = (k: string) => this.all().filter(p => p.kind === k).length;
  protected kindInfo = (k: string) => PROVIDER_KIND[k] ?? PROVIDER_KIND['router'];
  protected apiShort = (a: string[]) => a.map(x => ({ openai: 'OpenAI', 'openai-responses': 'Responses', anthropic: 'Anthropic', google: 'Gemini' } as Record<string, string>)[x] ?? x).join(' · ');
  protected go(id: string) { this.router.navigate(['/p', id]); }
  protected clear() {
    this.q.set(''); this.kind.set(''); this.billing.set(''); this.api.set('');
  }
}

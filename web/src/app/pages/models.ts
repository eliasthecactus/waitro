import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  LucideArrowDown, LucideArrowUp, LucideChevronsUpDown, LucideDynamicIcon, LucideSearch, LucideTrophy, LucideX, LucideSlidersHorizontal,
} from '@lucide/angular';
import { Api } from '../core/api';
import { accessShort, commercial, commercialOrder, date, params, platformName, price, priceSort, tokens } from '../core/format';
import { ModelSummary } from '../core/types';
import { LicenseChip, Platforms } from '../ui/chips';
import { IconTile } from '../ui/icon-tile';

type SortKey = 'name' | 'license' | 'params' | 'context' | 'price' | 'released';
interface Col { key: SortKey; label: string; get: (m: ModelSummary) => string | number | null; num?: boolean }

const COLS: Col[] = [
  { key: 'name', label: 'Model', get: m => m.name.toLowerCase() },
  { key: 'license', label: 'License', get: m => `${commercialOrder(m.license)}${m.license.id.toLowerCase()}` },
  { key: 'params', label: 'Params', get: m => m.params?.total ?? null, num: true },
  { key: 'context', label: 'Context', get: m => m.contextTokens, num: true },
  { key: 'price', label: 'Price', get: m => priceSort(m.pricing), num: true },
  { key: 'released', label: 'Released', get: m => m.released, num: true },
];

@Component({
  selector: 'app-models',
  imports: [RouterLink, IconTile, LicenseChip, Platforms, LucideDynamicIcon, LucideSearch, LucideX, LucideTrophy, LucideSlidersHorizontal],
  template: `
    <div class="wrap pt-10 sm:pt-14">
      <p class="eyebrow">Index</p>
      <div class="mt-2 flex flex-wrap items-end justify-between gap-3">
        <h1 class="text-4xl font-semibold tracking-tight">All models</h1>
        <p class="num text-sm text-muted">{{ rows().length }} of {{ all().length }}</p>
      </div>

      <!-- Toolbar -->
      <div class="sticky top-15 z-30 -mx-4 mt-6 border-y border-line/70 bg-bg/85 px-4 py-3 backdrop-blur-xl sm:mx-0 sm:rounded-2xl sm:border sm:px-3">
        <div class="flex flex-wrap items-center gap-2">
          <label class="relative min-w-0 flex-[1_1_220px]">
            <svg lucideSearch [size]="16" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
            <input type="search" class="field w-full !pl-9" placeholder="Filter by name, org, tag…" [value]="q()" (input)="set('q', $any($event.target).value)" aria-label="Filter" />
          </label>
          <div class="flex rounded-xl border border-line bg-surface p-0.5" role="group" aria-label="Type">
            @for (o of accessOpts; track o[0]) {
              <button type="button" (click)="set('access', o[0])" class="rounded-[10px] px-3 py-1.5 text-sm transition"
                [class]="access() === o[0] ? 'bg-ink text-bg' : 'text-muted hover:text-ink'">{{ o[1] }}</button>
            }
          </div>
          <button type="button" class="btn btn-ghost !h-10 !py-0 sm:hidden" (click)="showMore.set(!showMore())"><svg lucideSlidersHorizontal [size]="15" />Filters</button>
          <div class="w-full flex-wrap items-center gap-2 sm:flex sm:w-auto" [class.hidden]="!showMore()" [class.flex]="showMore()">
            <select class="field min-w-0 flex-1 sm:flex-none" [value]="task()" (change)="set('task', $any($event.target).value)" aria-label="Task">
              <option value="">All tasks</option>
              @for (d of api.meta()?.domains ?? []; track d.id) {
                <optgroup [label]="d.name">
                  @for (t of d.tasks; track t.id) { @if (t.count) { <option [value]="t.id" [selected]="t.id === task()">{{ t.name }} ({{ t.count }})</option> } }
                </optgroup>
              }
            </select>
            <select class="field min-w-0 flex-1 sm:flex-none" [value]="lic()" (change)="set('license', $any($event.target).value)" aria-label="License">
              @for (o of licenseOpts; track o[0]) { <option [value]="o[0]" [selected]="o[0] === lic()">{{ o[1] }}</option> }
            </select>
            <select class="field min-w-0 flex-1 sm:flex-none" [value]="platform()" (change)="set('platform', $any($event.target).value)" aria-label="Runs on">
              <option value="">Any hardware</option>
              @for (p of api.meta()?.platforms ?? []; track p) { <option [value]="p" [selected]="p === platform()">{{ platformName(p, true) }}</option> }
            </select>
            <label class="flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-line bg-surface px-3 text-sm text-muted">
              <input type="checkbox" class="accent-[var(--accent)]" [checked]="current()" (change)="set('current', $any($event.target).checked ? '1' : '')" />
              Latest only
            </label>
          </div>
          @if (filtered()) {
            <button type="button" class="flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-muted hover:text-ink" (click)="clear()"><svg lucideX [size]="14" />Clear</button>
          }
        </div>
      </div>

      <!-- Table (desktop) -->
      <div class="card mt-5 hidden overflow-x-auto md:block">
        <table class="w-full min-w-[920px] text-sm">
          <thead>
            <tr class="border-b border-line bg-subtle/60 text-left">
              @for (c of cols; track c.key) {
                <th class="px-3 py-3 font-medium" [attr.aria-sort]="sort() === c.key ? (dir() === 'asc' ? 'ascending' : 'descending') : 'none'"
                    [class.text-right]="c.num && c.key !== 'released'">
                  <button type="button" (click)="toggle(c.key)" class="inline-flex items-center gap-1 text-xs uppercase tracking-wider transition"
                          [class]="sort() === c.key ? 'text-ink' : 'text-faint hover:text-muted'">
                    {{ c.label }}<svg [lucideIcon]="sortIcon(c.key)" [size]="12" />
                  </button>
                </th>
              }
              <th class="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-faint">Runs on</th>
            </tr>
          </thead>
          <tbody>
            @for (m of rows(); track m.id) {
              <tr class="group cursor-pointer border-b border-line transition last:border-0 hover:bg-subtle/60" (click)="open(m.id)">
                <td class="max-w-[17rem] py-3 pl-4 pr-3">
                  <div class="flex items-center gap-3">
                    <app-icon-tile size="sm" [task]="m.tasks[0]" [domain]="m.domains[0]" />
                    <div class="min-w-0">
                      <a [routerLink]="['/m', m.id]" class="block truncate font-semibold tracking-tight group-hover:text-accent-ink" (click)="$event.stopPropagation()">{{ m.name }}</a>
                      <div class="flex items-center gap-1.5 truncate text-xs text-muted">
                        <span class="truncate">{{ m.org }}</span>
                        @if (m.rankings[0]; as r) { <span class="chip chip-accent !px-1.5 !py-0 !text-[10px]"><svg lucideTrophy [size]="10" />{{ r.rank ? '#' + r.rank : 'Pick' }}</span> }
                        @if (m.hasBetter) { <span class="chip chip-new !px-1.5 !py-0 !text-[10px]">Newer option</span> }
                      </div>
                    </div>
                  </div>
                </td>
                <td class="px-3 py-3"><app-license-chip [license]="m.license" /></td>
                <td class="num whitespace-nowrap px-3 py-3 text-right">{{ params(m.params) || '–' }}</td>
                <td class="num whitespace-nowrap px-3 py-3 text-right">{{ tokens(m.contextTokens) || '–' }}</td>
                <td class="num whitespace-nowrap px-3 py-3 text-right">{{ price(m.pricing) || '–' }}</td>
                <td class="num whitespace-nowrap px-3 py-3 text-muted">{{ date(m.released) || '–' }}</td>
                <td class="px-3 py-3"><app-platforms [platforms]="m.platforms" [wrap]="false" /></td>
              </tr>
            } @empty {
              <tr><td colspan="7" class="px-4 py-16 text-center text-muted">No model matches these filters.</td></tr>
            }
          </tbody>
        </table>
      </div>

      <!-- Cards (mobile) -->
      <div class="mt-5 flex flex-col gap-3 md:hidden">
        @for (m of rows(); track m.id) {
          <a [routerLink]="['/m', m.id]" class="card flex flex-col gap-3 p-4">
            <div class="flex items-center gap-3">
              <app-icon-tile [task]="m.tasks[0]" [domain]="m.domains[0]" />
              <div class="min-w-0 flex-1">
                <p class="truncate font-semibold tracking-tight">{{ m.name }}</p>
                <p class="truncate text-xs text-muted">{{ m.org }} · {{ accessShort(m.access) }}@if (m.released) { · {{ date(m.released) }} }</p>
              </div>
            </div>
            <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs">
              @if (params(m.params)) { <span><span class="text-faint">Params</span> <span class="num">{{ params(m.params) }}</span></span> }
              @if (m.contextTokens) { <span><span class="text-faint">Context</span> <span class="num">{{ tokens(m.contextTokens) }}</span></span> }
              @if (m.pricing) { <span><span class="text-faint">Price</span> <span class="num">{{ price(m.pricing) }}</span></span> }
            </div>
            <div class="flex flex-wrap items-center gap-1.5">
              @if (m.rankings[0]; as r) { <span class="chip chip-accent"><svg lucideTrophy [size]="12" />{{ r.rank ? '#' + r.rank : 'Pick' }} {{ r.taskName }}</span> }
              @if (m.hasBetter) { <span class="chip chip-new">Newer option</span> }
              <app-license-chip [license]="m.license" />
              <app-platforms [platforms]="m.platforms" />
            </div>
          </a>
        } @empty {
          <p class="py-16 text-center text-muted">No model matches these filters.</p>
        }
      </div>
    </div>
  `,
})
export class ModelsPage {
  protected readonly api = inject(Api);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly params$ = signal(this.route.snapshot.queryParamMap);

  protected readonly cols = COLS;
  protected readonly accessOpts = [['', 'All'], ['open', 'Open'], ['api', 'API']] as const;
  protected readonly licenseOpts = [['', 'Any license'], ['yes', 'Commercial use OK'], ['limited', 'Commercial OK or with conditions'], ['no', 'Non-commercial only']] as const;
  protected readonly showMore = signal(false);
  protected readonly accessShort = accessShort;
  protected readonly params = params;
  protected readonly tokens = tokens;
  protected readonly price = price;
  protected readonly date = date;
  protected readonly platformName = platformName;
  protected readonly commercial = commercial;

  protected readonly q = computed(() => this.params$().get('q') ?? '');
  protected readonly task = computed(() => this.params$().get('task') ?? '');
  protected readonly access = computed(() => this.params$().get('access') ?? '');
  protected readonly lic = computed(() => this.params$().get('license') ?? '');
  protected readonly platform = computed(() => this.params$().get('platform') ?? '');
  protected readonly current = computed(() => this.params$().get('current') === '1');
  protected readonly sort = computed(() => (this.params$().get('sort') as SortKey) || 'released');
  protected readonly dir = computed(() => this.params$().get('dir') || (this.sort() === 'released' ? 'desc' : 'asc'));
  protected readonly filtered = computed(() => Boolean(this.q() || this.task() || this.access() || this.lic() || this.platform() || this.current()));

  protected readonly all = computed(() => this.api.models() ?? []);
  protected readonly rows = computed(() => {
    const q = this.q().toLowerCase().split(/\s+/).filter(Boolean);
    const shown = this.all().filter(m => {
      if (this.task() && !m.tasks.includes(this.task())) return false;
      if (this.access() === 'open' && m.access === 'api') return false;
      if (this.access() === 'api' && m.access === 'open-weights') return false;
      if (this.lic() === 'yes' && m.license.commercial !== 'yes') return false;
      if (this.lic() === 'limited' && !['yes', 'limited'].includes(m.license.commercial)) return false;
      if (this.lic() === 'no' && m.license.commercial !== 'no') return false;
      if (this.platform() && !m.platforms.includes(this.platform())) return false;
      if (this.current() && m.hasBetter) return false;
      if (q.length) {
        const hay = `${m.name} ${m.org} ${m.summary} ${m.tags.join(' ')} ${m.license.id} ${m.tasks.map(t => this.api.taskName(t)).join(' ')}`.toLowerCase();
        if (!q.every(w => hay.includes(w))) return false;
      }
      return true;
    });
    const col = COLS.find(c => c.key === this.sort()) ?? COLS[COLS.length - 1];
    const sign = this.dir() === 'asc' ? 1 : -1;
    return shown.sort((a, b) => {
      const x = col.get(a), y = col.get(b);
      if (x == null && y == null) return a.name.localeCompare(b.name);
      if (x == null) return 1;
      if (y == null) return -1;
      return (x < y ? -1 : x > y ? 1 : 0) * sign || a.name.localeCompare(b.name);
    });
  });

  constructor() {
    this.route.queryParamMap.subscribe(p => this.params$.set(p));
    if (this.params$().keys.some(k => ['task', 'license', 'platform', 'current'].includes(k))) this.showMore.set(true);
  }

  protected set(key: string, value: string) {
    this.router.navigate([], { queryParams: { [key]: value || null }, queryParamsHandling: 'merge', replaceUrl: true });
  }

  protected toggle(key: SortKey) {
    const dir = this.sort() === key ? (this.dir() === 'asc' ? 'desc' : 'asc') : ['name', 'license'].includes(key) ? 'asc' : 'desc';
    this.router.navigate([], { queryParams: { sort: key === 'released' && dir === 'desc' ? null : key, dir: key === 'released' && dir === 'desc' ? null : dir }, queryParamsHandling: 'merge', replaceUrl: true });
  }

  protected sortIcon(key: SortKey) {
    return this.sort() !== key ? LucideChevronsUpDown : this.dir() === 'asc' ? LucideArrowUp : LucideArrowDown;
  }

  protected clear() {
    this.router.navigate([], { queryParams: {}, replaceUrl: true });
  }

  protected open(id: string) {
    this.router.navigate(['/m', id]);
  }
}

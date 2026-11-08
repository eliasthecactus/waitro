import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideArrowUpRight, LucideSparkles, LucideTriangleAlert, LucideTrophy } from '@lucide/angular';
import { Api } from '../core/api';
import { date, params, price, tokens } from '../core/format';
import { ModelSummary, Verdict } from '../core/types';
import { LicenseChip, Platforms } from './chips';
import { IconTile } from './icon-tile';

@Component({
  selector: 'app-model-card',
  imports: [RouterLink, IconTile, LicenseChip, Platforms, LucideArrowUpRight, LucideTriangleAlert, LucideTrophy, LucideSparkles],
  template: `
    @let m = model();
    <a [routerLink]="['/m', m.id]"
       class="card card-hover group relative flex h-full flex-col gap-4 overflow-hidden p-5"
       [class.ring-1]="verdict() === 'best'" [class.ring-accent]="verdict() === 'best'">
      @if (verdict() === 'best') {
        <span class="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-cyan-400"></span>
      }
      <div class="flex items-start gap-3">
        <app-icon-tile [task]="m.tasks[0]" [domain]="m.domains[0]" />
        <div class="min-w-0 flex-1">
          @if (verdictLabel()) {
            <p class="mb-0.5 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider"
               [class.text-accent-ink]="verdict() === 'best'" [class.text-faint]="verdict() !== 'best'">
              @if (verdict() === 'best') { <svg lucideSparkles [size]="12" /> }
              {{ verdictLabel() }}
            </p>
          }
          <h3 class="truncate text-[15px] font-semibold leading-snug tracking-tight">{{ m.name }}</h3>
          <p class="truncate text-xs text-muted">{{ m.org }}@if (m.released) { · {{ date(m.released) }} }</p>
        </div>
        <svg lucideArrowUpRight [size]="18" class="shrink-0 text-faint transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-ink" />
      </div>

      <p class="text-sm leading-relaxed text-muted" [class.line-clamp-3]="!why()">{{ why() || m.summary }}</p>
      @if (caveats()) {
        <p class="-mt-1 flex gap-1.5 text-[13px] leading-snug text-amber-700 dark:text-amber-400">
          <svg lucideTriangleAlert [size]="14" class="mt-0.5 shrink-0" />{{ caveats() }}
        </p>
      }

      <div class="mt-auto flex flex-col gap-3">
        @if (specs().length) {
          <div class="flex flex-wrap gap-x-4 gap-y-1 border-t border-line pt-3">
            @for (s of specs(); track s[0]) {
              <span class="text-xs"><span class="text-faint">{{ s[0] }}</span><span class="num ml-1.5 text-ink">{{ s[1] }}</span></span>
            }
          </div>
        }
        <div class="flex flex-wrap items-center gap-1.5">
          @if (rank(); as r) {
            <span class="chip chip-accent"><svg lucideTrophy [size]="12" />{{ r.rank ? '#' + r.rank : 'Pick' }} {{ r.taskName }}</span>
          }
          @if (m.hasBetter) { <span class="chip chip-new">Newer option</span> }
          <app-license-chip [license]="m.license" />
          <app-platforms [platforms]="m.platforms" />
        </div>
      </div>
    </a>
  `,
  host: { class: 'block min-w-0' },
})
export class ModelCard {
  private readonly api = inject(Api);
  readonly id = input.required<string>();
  readonly verdict = input<Verdict | null>(null);
  readonly why = input('');
  readonly caveats = input('');
  protected readonly date = date;
  protected readonly model = computed(() => this.api.modelById().get(this.id())!);
  protected readonly verdictLabel = computed(() => ({ best: 'Best fit', good: 'Good option', alternative: 'Alternative', match: 'Keyword match' } as Record<string, string>)[this.verdict() ?? ''] ?? '');
  protected readonly rank = computed(() => this.model().rankings[0] ?? null);
  protected readonly specs = computed(() => {
    const m = this.model();
    return [
      ['Params', params(m.params)],
      ['Context', tokens(m.contextTokens)],
      ['Price', price(m.pricing)],
      ['VRAM', m.minVramGB ? `${m.minVramGB} GB` : ''],
    ].filter(s => s[1]).slice(0, 3);
  });
}

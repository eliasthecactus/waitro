import { Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideDynamicIcon, LucideTriangleAlert, LucideWorkflow } from '@lucide/angular';
import { Api } from '../core/api';
import { IO_ICON } from '../core/icons';
import { Pipeline } from '../core/types';
import { IconTile } from './icon-tile';

@Component({
  selector: 'app-pipeline',
  imports: [RouterLink, IconTile, LucideDynamicIcon, LucideTriangleAlert, LucideWorkflow],
  template: `
    @let p = pipeline();
    <div class="card p-5 sm:p-6">
      <div class="mb-5 flex items-start gap-3">
        <span class="grid size-9 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-ink"><svg lucideWorkflow [size]="18" /></span>
        <div>
          <h3 class="font-semibold tracking-tight">{{ p.title }}</h3>
          <p class="mt-0.5 text-sm text-muted">{{ p.why }}</p>
        </div>
      </div>
      <ol class="flex flex-col gap-0 lg:flex-row lg:items-stretch">
        @for (s of p.steps; track $index) {
          @if ($index > 0) {
            <li class="flex items-center justify-center py-1 lg:px-1 lg:py-0" aria-hidden="true">
              <div class="flex items-center gap-2 lg:flex-col lg:gap-1">
                <span class="h-5 w-px bg-line-strong lg:h-px lg:w-5"></span>
                @if (s.handoff?.length) {
                  <span class="chip num !text-[10px]">
                    <svg [lucideIcon]="ioIcon(s.handoff![0])" [size]="11" />{{ s.handoff!.join(' / ') }}{{ s.fromEarlier ? ' ↺' : '' }}
                  </span>
                } @else {
                  <span class="chip chip-bad !text-[10px]"><svg lucideTriangleAlert [size]="11" />mismatch</span>
                }
                <span class="h-5 w-px bg-line-strong lg:h-px lg:w-5"></span>
              </div>
            </li>
          }
          @let m = api.modelById().get(s.id);
          <li class="min-w-0 flex-1">
            <a [routerLink]="['/m', s.id]" class="group flex h-full items-start gap-3 rounded-xl border border-line bg-subtle p-3.5 transition hover:border-line-strong hover:bg-surface">
              <span class="num mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-ink text-[11px] font-semibold text-bg">{{ $index + 1 }}</span>
              <span class="min-w-0">
                <span class="flex items-center gap-2">
                  <app-icon-tile size="sm" [task]="m?.tasks?.[0] ?? null" [domain]="m?.domains?.[0] ?? 'language'" />
                  <span class="truncate text-sm font-semibold group-hover:text-accent-ink">{{ m?.name ?? s.id }}</span>
                </span>
                <span class="mt-1.5 block text-[13px] leading-snug text-muted">{{ s.does }}</span>
              </span>
            </a>
          </li>
        }
      </ol>
      @if (!p.connected) {
        <p class="mt-4 flex items-center gap-1.5 text-[13px] text-amber-700 dark:text-amber-400">
          <svg lucideTriangleAlert [size]="14" />One hand-off doesn’t match the listed input and output types. Check that step before relying on it.
        </p>
      }
    </div>
  `,
})
export class PipelineView {
  protected readonly api = inject(Api);
  readonly pipeline = input.required<Pipeline>();
  protected ioIcon = (t: string) => IO_ICON[t] ?? IO_ICON['text'];
}

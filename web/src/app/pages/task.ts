import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { LucideArrowLeft, LucideArrowUpRight, LucideInfo, LucideTrophy } from '@lucide/angular';
import { Api } from '../core/api';
import { date } from '../core/format';
import { TaskPage as TaskData } from '../core/types';
import { IconTile } from '../ui/icon-tile';
import { ModelCard } from '../ui/model-card';

@Component({
  selector: 'app-task',
  imports: [RouterLink, IconTile, ModelCard, LucideArrowLeft, LucideTrophy, LucideArrowUpRight, LucideInfo],
  template: `
    @if (t(); as t) {
      <div class="relative -mt-15 pt-15">
        <div class="hero-glow pointer-events-none absolute inset-x-0 top-0 -z-10 h-96 opacity-60"></div>
        <div class="wrap pt-8 sm:pt-10">
          <a routerLink="/tasks" class="flex w-fit items-center gap-1 text-sm text-muted hover:text-ink"><svg lucideArrowLeft [size]="14" />All tasks</a>
          <div class="mt-6 flex items-center gap-4">
            <app-icon-tile size="lg" [task]="t.id" [domain]="t.domain" />
            <div>
              <p class="eyebrow">{{ domainName() }}</p>
              <h1 class="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">{{ t.name }}</h1>
            </div>
          </div>

          @if (t.ranking; as r) {
            <section class="mt-10">
              <h2 class="flex items-center gap-2 text-xl font-semibold tracking-tight"><svg lucideTrophy [size]="18" class="text-accent" />Top picks</h2>
              <ol class="mt-4 grid gap-3" [class.md:grid-cols-2]="r.picks.length > 1">
                @for (p of r.picks; track p.id; let i = $index) {
                  @let m = api.modelById().get(p.id);
                  <li>
                    <a [routerLink]="['/m', p.id]" class="card card-hover group relative flex h-full gap-4 overflow-hidden p-5">
                      @if (i === 0 && p.rank === 1) { <span class="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-cyan-400"></span> }
                      <span class="num grid size-11 shrink-0 place-items-center rounded-xl text-lg font-semibold"
                            [class]="p.rank === 1 ? 'bg-accent text-white dark:text-bg' : 'bg-subtle text-ink'">{{ p.rank ? p.rank : '★' }}</span>
                      <span class="min-w-0 flex-1">
                        <span class="flex items-start justify-between gap-2">
                          <span class="min-w-0">
                            <span class="block truncate text-lg font-semibold tracking-tight group-hover:text-accent-ink">{{ m?.name }}</span>
                            <span class="mt-0.5 block text-sm font-medium text-accent-ink">{{ p.label }}</span>
                          </span>
                          <svg lucideArrowUpRight [size]="17" class="shrink-0 text-faint transition group-hover:text-ink" />
                        </span>
                        <span class="mt-2 block text-sm leading-relaxed text-muted">{{ p.why }}</span>
                      </span>
                    </a>
                  </li>
                }
              </ol>
              <p class="mt-3 flex items-center gap-1.5 text-xs text-faint"><svg lucideInfo [size]="12" />Editorial picks, updated {{ date(r.updated, true) }}. LLM picks are labelled by use case instead of numbered, because vendors measure benchmarks differently.</p>
            </section>
          }

          <section class="mt-14">
            <h2 class="text-xl font-semibold tracking-tight">{{ t.ranking ? 'All models for this task' : 'Models' }} <span class="num text-base font-normal text-faint">{{ t.models.length }}</span></h2>
            @if (sorted().length) {
              <div class="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                @for (m of sorted(); track m.id) { <app-model-card [id]="m.id" /> }
              </div>
            } @else {
              <p class="mt-4 text-muted">Nothing here yet. <a [href]="api.meta()?.repo" target="_blank" rel="noopener" class="text-accent-ink hover:underline">Suggest a model on GitHub</a>.</p>
            }
          </section>
        </div>
      </div>
    } @else if (error()) {
      <div class="wrap pt-24 text-center"><h1 class="text-3xl font-semibold tracking-tight">Unknown task</h1><a routerLink="/tasks" class="btn btn-ghost mt-6">All tasks</a></div>
    }
  `,
})
export class TaskPage {
  protected readonly api = inject(Api);
  private readonly title = inject(Title);
  readonly id = input.required<string>();
  protected readonly t = signal<TaskData | null>(null);
  protected readonly error = signal(false);
  protected readonly date = date;
  protected readonly domainName = computed(() => this.api.meta()?.domains.find(d => d.id === this.t()?.domain)?.name ?? '');
  protected readonly sorted = computed(() => {
    const t = this.t();
    if (!t) return [];
    const ranked = new Set(t.ranking?.picks.map(p => p.id));
    return [...t.models].sort((a, b) => Number(ranked.has(b.id)) - Number(ranked.has(a.id)) || (b.released ?? '').localeCompare(a.released ?? ''));
  });

  constructor() {
    effect(() => {
      const id = this.id();
      this.t.set(null);
      this.api.task(id).then(t => { this.t.set(t); this.title.setTitle(`${t.name} · Waitro`); }, () => this.error.set(true));
    });
  }
}

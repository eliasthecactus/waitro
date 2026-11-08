import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideArrowUpRight, LucideDynamicIcon, LucideTrophy } from '@lucide/angular';
import { Api } from '../core/api';
import { DOMAIN_ICON, DOMAIN_TONE, TASK_ICON } from '../core/icons';

@Component({
  selector: 'app-tasks',
  imports: [RouterLink, LucideDynamicIcon, LucideTrophy, LucideArrowUpRight],
  template: `
    <div class="wrap pt-10 sm:pt-14">
      <p class="eyebrow">Browse</p>
      <h1 class="mt-2 text-4xl font-semibold tracking-tight">Tasks</h1>
      <p class="mt-2 max-w-xl text-muted">Pick what you want to do. Tasks with a trophy have curated top picks.</p>
      @for (d of api.meta()?.domains ?? []; track d.id) {
        <section class="mt-12">
          <div class="flex items-center gap-3">
            <span class="grid size-9 place-items-center rounded-xl {{ tone(d.id) }}"><svg [lucideIcon]="domainIcon(d.id)" [size]="18" [strokeWidth]="1.75" /></span>
            <h2 class="text-xl font-semibold tracking-tight">{{ d.name }}</h2>
          </div>
          <div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            @for (t of d.tasks; track t.id) {
              <a [routerLink]="['/t', t.id]" class="card card-hover group flex items-center gap-3.5 p-4" [class.opacity-60]="!t.count">
                <span class="grid size-10 shrink-0 place-items-center rounded-xl bg-subtle text-muted transition group-hover:text-ink"><svg [lucideIcon]="taskIcon(t.id)" [size]="18" [strokeWidth]="1.75" /></span>
                <span class="min-w-0 flex-1">
                  <span class="block truncate font-medium">{{ t.name }}</span>
                  <span class="num text-xs text-faint">{{ t.count }} {{ t.count === 1 ? 'model' : 'models' }}</span>
                </span>
                @if (t.ranked) { <span class="grid size-7 place-items-center rounded-lg bg-accent-soft text-accent-ink" title="Has top picks"><svg lucideTrophy [size]="14" /></span> }
                <svg lucideArrowUpRight [size]="16" class="text-faint transition group-hover:text-ink" />
              </a>
            }
          </div>
        </section>
      }
    </div>
  `,
})
export class TasksPage {
  protected readonly api = inject(Api);
  protected tone = (d: string) => DOMAIN_TONE[d];
  protected domainIcon = (d: string) => DOMAIN_ICON[d];
  protected taskIcon = (t: string) => TASK_ICON[t];
}

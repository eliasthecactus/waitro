import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { LucideDynamicIcon, LucideGitBranch, LucideKeyRound, LucideLayoutGrid, LucideMonitor, LucideMoon, LucideRows3, LucideSearch, LucideSun, LucideInfo } from '@lucide/angular';
import { UserKey } from './core/key';
import { KeyDialog } from './ui/key-dialog';
import { Api } from './core/api';
import { Theme } from './core/theme';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LucideDynamicIcon, LucideGitBranch, LucideKeyRound, KeyDialog],
  template: `
    <header class="sticky top-0 z-40 border-b border-line bg-bg/95 backdrop-blur-xl transition-shadow duration-200" [class.shadow-header]="scrolled()">
      <div class="wrap flex h-15 items-center gap-2">
        <a routerLink="/" class="mr-2 flex items-center gap-2.5 rounded-lg" aria-label="Waitro home">
          <img src="icon.svg" alt="" class="size-7" />
          <span class="text-[17px] font-semibold tracking-tight">waitro</span>
        </a>
        <nav class="ml-auto flex items-center gap-0.5 sm:ml-4 sm:mr-auto" aria-label="Main">
          @for (n of nav; track n.path) {
            <a [routerLink]="n.path" routerLinkActive="!text-ink bg-subtle" [routerLinkActiveOptions]="{ exact: n.path === '/' }"
               class="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm text-muted transition hover:text-ink" [attr.aria-label]="n.label">
              <svg [lucideIcon]="n.icon" [size]="16" class="sm:hidden" />
              <span class="hidden sm:inline">{{ n.label }}</span>
            </a>
          }
        </nav>
        @if (api.meta()) {
          <button type="button" (click)="userKey.open()"
                  class="relative grid size-9 place-items-center rounded-lg text-muted transition hover:bg-subtle hover:text-ink"
                  [title]="userKey.key() ? 'Your OpenRouter key is set' : 'Add your OpenRouter key for AI search'" aria-label="OpenRouter key">
            <svg lucideKeyRound [size]="17" />
            <span class="absolute right-1.5 top-1.5 size-2 rounded-full ring-2 ring-bg" [class]="userKey.key() ? 'bg-emerald-500' : 'bg-amber-500'"></span>
          </button>
        }
        <a [href]="api.meta()?.repo" target="_blank" rel="noopener"
           class="grid size-9 place-items-center rounded-lg text-muted transition hover:bg-subtle hover:text-ink" title="Source on GitHub" aria-label="Source on GitHub">
          <svg lucideGitBranch [size]="17" />
        </a>
        <button type="button" (click)="theme.cycle()"
                class="grid size-9 place-items-center rounded-lg text-muted transition hover:bg-subtle hover:text-ink"
                [title]="'Theme: ' + theme.choice()" [attr.aria-label]="'Theme: ' + theme.choice() + ', click to change'">
          <svg [lucideIcon]="themeIcon()" [size]="17" />
        </button>
      </div>
    </header>

    <app-key-dialog />
    <main class="min-h-[70vh]">
      <router-outlet />
    </main>

    <footer class="mt-24 border-t border-line">
      <div class="wrap flex flex-col gap-6 py-10 sm:flex-row sm:items-start sm:justify-between">
        <div class="max-w-sm">
          <div class="flex items-center gap-2"><img src="icon.svg" alt="" class="size-6" /><span class="font-semibold tracking-tight">waitro</span></div>
          <p class="mt-3 text-sm text-muted">Which AI is the right one? A curated index of AI models, with facts taken from model cards, papers, repos and vendor pages.</p>
        </div>
        <div class="flex gap-12 text-sm">
          <div class="flex flex-col gap-2">
            <span class="eyebrow mb-1">Explore</span>
            <a routerLink="/" class="text-muted hover:text-ink">Search</a>
            <a routerLink="/models" class="text-muted hover:text-ink">All models</a>
            <a routerLink="/tasks" class="text-muted hover:text-ink">Tasks</a>
          </div>
          <div class="flex flex-col gap-2">
            <span class="eyebrow mb-1">Project</span>
            <a routerLink="/about" class="text-muted hover:text-ink">About</a>
            <a [href]="api.meta()?.repo" target="_blank" rel="noopener" class="text-muted hover:text-ink">GitHub</a>
            <span class="num text-xs text-faint">v{{ api.meta()?.version }} · {{ api.meta()?.count }} models</span>
          </div>
        </div>
      </div>
    </footer>
  `,
})
export class App {
  protected readonly scrolled = signal(false);
  protected readonly api = inject(Api);
  constructor() {
    window.addEventListener('scroll', () => this.scrolled.set(window.scrollY > 4), { passive: true });
  }
  protected readonly theme = inject(Theme);
  protected readonly userKey = inject(UserKey);
  protected readonly nav = [
    { path: '/', label: 'Search', icon: LucideSearch },
    { path: '/models', label: 'All models', icon: LucideRows3 },
    { path: '/tasks', label: 'Tasks', icon: LucideLayoutGrid },
    { path: '/about', label: 'About', icon: LucideInfo },
  ];
  protected readonly themeIcon = computed(() => ({ system: LucideMonitor, light: LucideSun, dark: LucideMoon })[this.theme.choice()]);
}

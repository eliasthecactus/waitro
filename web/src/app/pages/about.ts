import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideBadgeCheck, LucideDynamicIcon, LucideGitPullRequest, LucideRoute, LucideShieldCheck, LucideSparkles, LucideTrophy } from '@lucide/angular';
import { Api } from '../core/api';

@Component({
  selector: 'app-about',
  imports: [RouterLink, LucideDynamicIcon],
  template: `
    <div class="wrap max-w-3xl pt-14">
      <p class="eyebrow">About</p>
      <h1 class="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">Finding the right model shouldn’t take a week of research.</h1>
      <p class="mt-6 text-lg leading-relaxed text-muted">
        There are millions of AI models and new ones every week. Waitro is a small, hand-checked index of the ones worth knowing,
        with the facts you need to choose: what a model does, what it runs on, what it costs and what its licence allows.
      </p>
      <div class="mt-12 grid gap-4 sm:grid-cols-2">
        @for (f of features; track f.title) {
          <div class="card p-5">
            <span class="grid size-9 place-items-center rounded-xl bg-accent-soft text-accent-ink"><svg [lucideIcon]="f.icon" [size]="18" /></span>
            <h2 class="mt-4 font-semibold tracking-tight">{{ f.title }}</h2>
            <p class="mt-1.5 text-sm leading-relaxed text-muted">{{ f.text }}</p>
          </div>
        }
      </div>
      <div class="mt-12 rounded-2xl border border-line bg-subtle p-6">
        <h2 class="font-semibold tracking-tight">Contribute</h2>
        <p class="mt-2 text-sm leading-relaxed text-muted">
          Every model is a small YAML file in the <a [href]="api.meta()?.repo" target="_blank" rel="noopener" class="text-accent-ink hover:underline">public repository</a>.
          Found something wrong, or a model that belongs here? Open an issue or a pull request. Every model page links to its file.
        </p>
        <div class="mt-4 flex flex-wrap gap-2">
          <a routerLink="/models" class="btn btn-primary">Browse all models</a>
          <a [href]="api.meta()?.repo" target="_blank" rel="noopener" class="btn btn-ghost">GitHub</a>
        </div>
      </div>
      <p class="mt-8 text-xs text-faint">Waitro is not affiliated with any model vendor. Medical models listed here are not medical devices.</p>
    </div>
  `,
})
export class AboutPage {
  protected readonly api = inject(Api);
  protected readonly features = [
    { icon: LucideSparkles, title: 'Search by goal', text: 'Describe what you want to achieve. Claude reads the whole index and picks the models that fit, with reasons and trade-offs.' },
    { icon: LucideRoute, title: 'Chains of models', text: 'When one model can’t do the job, Waitro suggests a chain and checks that each step’s input and output fit together.' },
    { icon: LucideBadgeCheck, title: 'Checked facts', text: 'Every entry is checked against the model card, paper, repo or vendor pricing page. Authors’ own numbers are marked as self-reported.' },
    { icon: LucideTrophy, title: 'Top picks and replacements', text: 'Each task has dated editorial picks, and when a newer or more efficient model replaces one, its page says so at the top.' },
    { icon: LucideShieldCheck, title: 'Only real models', text: 'The AI can only recommend models that are in the index. Anything else is dropped before it reaches you.' },
    { icon: LucideGitPullRequest, title: 'Open and reviewable', text: 'The whole catalog lives in git, so every change is visible and anyone can suggest fixes.' },
  ];
}

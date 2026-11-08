import { Component, ElementRef, effect, inject, signal, viewChild } from '@angular/core';
import {
  LucideCheck, LucideExternalLink, LucideEye, LucideEyeOff, LucideKeyRound, LucideLoaderCircle, LucideShieldCheck, LucideTrash2, LucideX,
} from '@lucide/angular';
import { Api } from '../core/api';
import { UserKey } from '../core/key';

@Component({
  selector: 'app-key-dialog',
  imports: [LucideKeyRound, LucideX, LucideEye, LucideEyeOff, LucideShieldCheck, LucideExternalLink, LucideTrash2, LucideCheck, LucideLoaderCircle],
  template: `
    <dialog #dlg (close)="userKey.dialogOpen.set(false)" (click)="backdrop($event)"
      class="m-auto w-[min(100%-2rem,32rem)] rounded-2xl border border-line bg-surface p-0 text-ink shadow-2xl backdrop:bg-black/40 backdrop:backdrop-blur-sm">
      <form method="dialog" class="flex flex-col gap-5 p-6" (submit)="$event.preventDefault(); save()">
        <div class="flex items-start gap-3">
          <span class="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-ink"><svg lucideKeyRound [size]="19" /></span>
          <div class="flex-1">
            <h2 class="text-lg font-semibold tracking-tight">Your OpenRouter key</h2>
            <p class="mt-1 text-sm text-muted">AI search runs on your own OpenRouter account. A search usually costs well under one cent.</p>
          </div>
          <button type="button" class="grid size-8 place-items-center rounded-lg text-muted hover:bg-subtle hover:text-ink" (click)="close()" aria-label="Close"><svg lucideX [size]="17" /></button>
        </div>

        <label class="flex flex-col gap-1.5">
          <span class="text-sm font-medium">API key</span>
          <span class="relative">
            <input #input [type]="show() ? 'text' : 'password'" class="field w-full !pr-10 font-mono" placeholder="sk-or-v1-…" autocomplete="off" spellcheck="false"
              [value]="draft()" (input)="draft.set($any($event.target).value.trim()); status.set(null)" aria-label="OpenRouter API key" />
            <button type="button" class="absolute right-1.5 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-muted hover:text-ink" (click)="show.set(!show())" [attr.aria-label]="show() ? 'Hide key' : 'Show key'">
              @if (show()) { <svg lucideEyeOff [size]="15" /> } @else { <svg lucideEye [size]="15" /> }
            </button>
          </span>
          <a href="https://openrouter.ai/keys" target="_blank" rel="noopener" class="flex w-fit items-center gap-1 text-xs text-accent-ink hover:underline">Create a key on openrouter.ai<svg lucideExternalLink [size]="11" /></a>
        </label>

        @if (status(); as st) {
          <p class="flex items-center gap-2 rounded-xl p-3 text-sm" [class]="st.ok ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'bg-rose-500/10 text-rose-700 dark:text-rose-300'">
            @if (st.ok) { <svg lucideCheck [size]="16" class="shrink-0" /> }
            {{ st.text }}
          </p>
        }

        <p class="flex gap-2 rounded-xl bg-subtle p-3 text-[13px] leading-snug text-muted">
          <svg lucideShieldCheck [size]="16" class="mt-px shrink-0" />
          The key is saved only in this browser and sent straight to OpenRouter with your searches. Waitro has no server, so the key never goes anywhere else. You can remove it any time.
        </p>

        <div class="flex flex-wrap items-center justify-between gap-2">
          @if (userKey.key()) {
            <button type="button" class="btn btn-ghost !py-2 text-rose-600 dark:text-rose-400" (click)="remove()"><svg lucideTrash2 [size]="15" />Remove key</button>
          } @else { <span></span> }
          <button type="submit" class="btn btn-primary !py-2" [disabled]="busy() || !draft()">
            @if (busy()) { <svg lucideLoaderCircle [size]="15" class="animate-spin" />Checking } @else { Check and save }
          </button>
        </div>
      </form>
    </dialog>
  `,
})
export class KeyDialog {
  protected readonly userKey = inject(UserKey);
  private readonly api = inject(Api);
  private readonly dlg = viewChild.required<ElementRef<HTMLDialogElement>>('dlg');
  private readonly input = viewChild.required<ElementRef<HTMLInputElement>>('input');
  protected readonly draft = signal('');
  protected readonly show = signal(false);
  protected readonly busy = signal(false);
  protected readonly status = signal<{ ok: boolean; text: string } | null>(null);

  constructor() {
    effect(() => {
      const el = this.dlg().nativeElement;
      if (this.userKey.dialogOpen() && !el.open) {
        this.draft.set(this.userKey.key());
        this.status.set(this.userKey.key() ? { ok: true, text: 'A key is saved in this browser.' } : null);
        el.showModal();
        queueMicrotask(() => this.input().nativeElement.focus());
      } else if (!this.userKey.dialogOpen() && el.open) {
        el.close();
      }
    });
  }

  protected async save() {
    const k = this.draft();
    if (!k) return;
    this.busy.set(true);
    try {
      const r = await this.api.checkKey(k);
      this.userKey.set(k);
      const credit = r.remaining != null ? ` $${r.remaining.toFixed(2)} of $${(r.limit ?? 0).toFixed(2)} left on this key.` : '';
      this.status.set({ ok: true, text: `Key works and is saved.${credit}` });
    } catch (e) {
      this.status.set({ ok: false, text: (e as Error).message });
    } finally {
      this.busy.set(false);
    }
  }

  protected remove() {
    this.userKey.clear();
    this.draft.set('');
    this.status.set({ ok: true, text: 'Key removed from this browser.' });
  }

  protected close() {
    this.userKey.dialogOpen.set(false);
  }

  protected backdrop(e: MouseEvent) {
    if (e.target === this.dlg().nativeElement) this.close();
  }
}

import { Injectable, signal } from '@angular/core';

const STORAGE = 'waitro-openrouter-key';

/**
 * The visitor's own OpenRouter key. It lives only in this browser (localStorage) and is sent with
 * AI searches; the server uses it for that one request and never stores it.
 */
@Injectable({ providedIn: 'root' })
export class UserKey {
  readonly key = signal<string>(this.read());
  readonly dialogOpen = signal(false);

  set(value: string) {
    this.key.set(value);
    try { localStorage.setItem(STORAGE, value); } catch { /* storage blocked: key only lasts this session */ }
  }

  clear() {
    this.key.set('');
    try { localStorage.removeItem(STORAGE); } catch { /* ignore */ }
  }

  open() {
    this.dialogOpen.set(true);
  }

  private read(): string {
    try { return localStorage.getItem(STORAGE) || ''; } catch { return ''; }
  }
}

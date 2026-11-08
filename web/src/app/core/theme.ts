import { Injectable, signal } from '@angular/core';

export type ThemeChoice = 'system' | 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class Theme {
  readonly choice = signal<ThemeChoice>(this.read());

  constructor() {
    this.apply(this.choice());
  }

  cycle() {
    const next: ThemeChoice = this.choice() === 'system' ? 'light' : this.choice() === 'light' ? 'dark' : 'system';
    this.choice.set(next);
    this.apply(next);
    try { localStorage.setItem('waitro-theme', next); } catch { /* private mode */ }
  }

  private apply(c: ThemeChoice) {
    const root = document.documentElement;
    if (c === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', c);
  }

  private read(): ThemeChoice {
    try {
      const v = localStorage.getItem('waitro-theme');
      return v === 'light' || v === 'dark' ? v : 'system';
    } catch {
      return 'system';
    }
  }
}

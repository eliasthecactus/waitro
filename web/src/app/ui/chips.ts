import { Component, computed, input } from '@angular/core';
import { LucideDynamicIcon, LucideScale } from '@lucide/angular';
import { commercial, platformName } from '../core/format';
import { PLATFORM_ICON } from '../core/icons';
import { License } from '../core/types';

@Component({
  selector: 'app-license-chip',
  imports: [LucideScale],
  template: `<span class="chip max-w-[10rem] {{ info().cls }}" [title]="license().id + ' · ' + (license().note || info().long)"><svg lucideScale [size]="12" class="shrink-0" /><span class="truncate">{{ license().id }}</span></span>`,
  host: { class: 'contents' },
})
export class LicenseChip {
  readonly license = input.required<License>();
  protected readonly info = computed(() => commercial(this.license()));
}

@Component({
  selector: 'app-platforms',
  imports: [LucideDynamicIcon],
  template: `
    @for (p of platforms(); track p) {
      @if (labels()) {
        <span class="chip"><svg [lucideIcon]="icon(p)" [size]="12" />{{ name(p, true) }}</span>
      } @else {
        <span class="grid size-6 place-items-center rounded-md bg-subtle text-muted" [title]="name(p, true)">
          <svg [lucideIcon]="icon(p)" [size]="13" />
        </span>
      }
    }
  `,
  host: { class: 'flex items-center gap-1', '[class.flex-wrap]': 'wrap()' },
})
export class Platforms {
  readonly platforms = input<string[]>([]);
  readonly labels = input(false);
  readonly wrap = input(true);
  protected icon = (p: string) => PLATFORM_ICON[p];
  protected name = platformName;
}

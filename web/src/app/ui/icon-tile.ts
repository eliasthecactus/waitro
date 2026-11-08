import { Component, computed, input } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';
import { DOMAIN_ICON, DOMAIN_TONE, TASK_ICON } from '../core/icons';

/** Rounded square with a task/domain icon, tinted by domain. */
@Component({
  selector: 'app-icon-tile',
  imports: [LucideDynamicIcon],
  template: `
    <span class="grid shrink-0 place-items-center rounded-xl {{ tone() }}" [style.width.px]="px()" [style.height.px]="px()">
      <svg [lucideIcon]="icon()" [size]="iconSize()" [strokeWidth]="1.75" />
    </span>
  `,
  host: { class: 'contents' },
})
export class IconTile {
  readonly task = input<string | null>(null);
  readonly domain = input<string>('language');
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  protected readonly px = computed(() => ({ sm: 28, md: 40, lg: 56 })[this.size()]);
  protected readonly iconSize = computed(() => ({ sm: 15, md: 19, lg: 26 })[this.size()]);
  protected readonly icon = computed(() => (this.task() && TASK_ICON[this.task()!]) || DOMAIN_ICON[this.domain()] || DOMAIN_ICON['language']);
  protected readonly tone = computed(() => DOMAIN_TONE[this.domain()] ?? DOMAIN_TONE['language']);
}

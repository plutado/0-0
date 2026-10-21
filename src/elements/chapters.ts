import type { ChapterData, Cue } from '../format/types';
import { builtinDataValidators } from '../format/validate';
import { formatClock, h, spokenTime } from './dom';
import type { ElementPlugin } from './types';

/**
 * Chapter navigation: a heading showing the current chapter and a list of
 * chapters that seek on activation. The current-chapter line is a polite
 * live region, because chapter changes are rare and meaningful.
 */
export const chaptersPlugin: ElementPlugin<ChapterData> = {
  type: 'chapter',
  validate: builtinDataValidators.chapter,
  mount(container, cues, ctx) {
    const doc = ctx.document;
    const sorted = [...cues].sort((a, b) => a.start - b.start);
    const current = h(doc, 'p', { class: 'zz-chapters__current', 'aria-live': 'polite' });
    const list = h(doc, 'ol', { class: 'zz-chapters__list' });
    const buttons = new Map<string, HTMLButtonElement>();
    const active = new Map<string, Cue<ChapterData>>();

    for (const cue of sorted) {
      const button = h(
        doc,
        'button',
        { type: 'button', class: 'zz-chapters__seek', 'aria-label': `${cue.data.title}, ${spokenTime(cue.start)}` },
        h(doc, 'span', { class: 'zz-chapters__time', 'aria-hidden': 'true' }, formatClock(cue.start)),
        h(doc, 'span', { class: 'zz-chapters__title', 'aria-hidden': 'true' }, cue.data.title),
      );
      button.addEventListener('click', () => ctx.seek(cue.start));
      buttons.set(cue.id, button);
      list.append(h(doc, 'li', {}, button));
    }

    const nav = h(doc, 'nav', { class: 'zz-chapters', 'aria-label': ctx.region.label ?? 'Chapters' }, current, list);
    container.append(nav);

    const render = () => {
      // With overlapping chapters, the one that started most recently wins.
      const latest = [...active.values()].sort((a, b) => b.start - a.start)[0];
      for (const [id, button] of buttons) {
        if (latest && id === latest.id) button.setAttribute('aria-current', 'true');
        else button.removeAttribute('aria-current');
      }
      current.textContent = latest ? `Chapter: ${latest.data.title}` : '';
    };

    return {
      enter(cue) {
        active.set(cue.id, cue);
        render();
      },
      exit(cue) {
        active.delete(cue.id);
        render();
      },
      destroy() {
        nav.remove();
        buttons.clear();
        active.clear();
      },
    };
  },
};

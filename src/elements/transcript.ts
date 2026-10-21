import type { Cue, TranscriptData } from '../format/types';
import { builtinDataValidators } from '../format/validate';
import { formatClock, h, spokenTime } from './dom';
import type { ElementPlugin } from './types';

/** How long after the user scrolls the transcript before auto-scroll resumes. */
const USER_SCROLL_GRACE_MS = 4000;

/**
 * An interactive transcript. Every line is rendered up front as a button that
 * seeks to its start; the active line is highlighted with aria-current and
 * kept in view without scrolling the page. Auto-scroll pauses briefly while
 * the user is scrolling or has focus inside the list, and jumps instead of
 * animating when reduced motion is preferred.
 *
 * Deliberately not a live region: announcing every line would talk over the
 * media. Screen reader users get the media's own captions.
 */
export const transcriptPlugin: ElementPlugin<TranscriptData> = {
  type: 'transcript',
  validate: builtinDataValidators.transcript,
  mount(container, cues, ctx) {
    const doc = ctx.document;
    const sorted = [...cues].sort((a, b) => a.start - b.start);
    const list = h(doc, 'ol', { class: 'zz-transcript' });
    const rows = new Map<string, HTMLLIElement>();
    let lastSpeaker: string | undefined;

    for (const cue of sorted) {
      const speaker = cue.data.speaker;
      const showSpeaker = speaker !== undefined && speaker !== lastSpeaker;
      lastSpeaker = speaker;
      const button = h(
        doc,
        'button',
        {
          type: 'button',
          class: 'zz-transcript__seek',
          'aria-label': `${speaker ? `${speaker}: ` : ''}${cue.data.text} (play from ${spokenTime(cue.start)})`,
        },
        h(doc, 'span', { class: 'zz-transcript__time', 'aria-hidden': 'true' }, formatClock(cue.start)),
        h(
          doc,
          'span',
          { class: 'zz-transcript__text', 'aria-hidden': 'true' },
          showSpeaker ? h(doc, 'span', { class: 'zz-transcript__speaker' }, `${speaker}: `) : null,
          cue.data.text,
        ),
      );
      button.addEventListener('click', () => ctx.seek(cue.start));
      const row = h(doc, 'li', { class: 'zz-transcript__line' }, button);
      row.dataset.cueId = cue.id;
      rows.set(cue.id, row);
      list.append(row);
    }
    container.append(list);

    let userScrolledAt = -Infinity;
    const markUserScroll = () => {
      userScrolledAt = Date.now();
    };
    // wheel/touch/keyboard mean a person is scrolling; programmatic scrolls fire none of these.
    container.addEventListener('wheel', markUserScroll, { passive: true });
    container.addEventListener('touchmove', markUserScroll, { passive: true });
    container.addEventListener('keydown', markUserScroll);

    const keepInView = (row: HTMLElement) => {
      if (Date.now() - userScrolledAt < USER_SCROLL_GRACE_MS) return;
      if (container.contains(doc.activeElement) && doc.activeElement !== row.firstElementChild) return;
      // The region is position: relative, so offsetTop is measured from it.
      const top = row.offsetTop;
      const visibleTop = container.scrollTop;
      const visibleBottom = visibleTop + container.clientHeight;
      if (top >= visibleTop && top + row.offsetHeight <= visibleBottom) return;
      const target = Math.max(0, top - container.clientHeight / 3);
      if (typeof container.scrollTo === 'function') {
        container.scrollTo({ top: target, behavior: ctx.prefersReducedMotion() ? 'auto' : 'smooth' });
      } else {
        container.scrollTop = target;
      }
    };

    return {
      enter(cue: Cue<TranscriptData>) {
        const row = rows.get(cue.id);
        if (!row) return;
        row.classList.add('zz-active');
        row.firstElementChild?.setAttribute('aria-current', 'true');
        keepInView(row);
      },
      exit(cue: Cue<TranscriptData>) {
        const row = rows.get(cue.id);
        if (!row) return;
        row.classList.remove('zz-active');
        row.firstElementChild?.removeAttribute('aria-current');
      },
      destroy() {
        container.removeEventListener('wheel', markUserScroll);
        container.removeEventListener('touchmove', markUserScroll);
        container.removeEventListener('keydown', markUserScroll);
        list.remove();
        rows.clear();
      },
    };
  },
};

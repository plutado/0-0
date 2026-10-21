// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { createPlayer } from '../src/player/player';
import { createDefaultRegistry, type ElementRegistry } from '../src/elements/registry';
import { transientPlugin } from '../src/elements/transient';
import { CueFormatError } from '../src/format/validate';
import type { CueDocument } from '../src/format/types';

const doc: CueDocument = {
  version: 1,
  regions: [
    { id: 'chapters', placement: 'sidebar', label: 'Chapters' },
    { id: 'transcript', placement: 'sidebar', label: 'Transcript' },
    { id: 'notes', placement: 'below', label: 'Notes', announce: true },
    { id: 'corner', placement: 'overlay', position: 'top-left' },
  ],
  cues: [
    { id: 'ch1', start: 0, end: 5, type: 'chapter', region: 'chapters', data: { title: 'One' } },
    { id: 'ch2', start: 5, end: 10, type: 'chapter', region: 'chapters', data: { title: 'Two' } },
    { id: 't1', start: 0, end: 5, type: 'transcript', region: 'transcript', data: { text: 'First', speaker: 'Host' } },
    { id: 't2', start: 5, end: 10, type: 'transcript', region: 'transcript', data: { text: 'Second' } },
    { id: 'l1', start: 6, end: 9, type: 'link', region: 'notes', data: { title: 'A source', url: 'https://example.com/a', source: 'Example' } },
    { id: 'i1', start: 1, end: 3, type: 'image', region: 'corner', data: { src: 'a.svg', alt: 'A shape' } },
  ],
};

function mount(cues = doc, registry?: ElementRegistry) {
  const container = document.createElement('div');
  document.body.append(container);
  const player = createPlayer({ container, cues, ...(registry ? { registry } : {}) });
  return { container, player };
}

function at(player: ReturnType<typeof mount>['player'], t: number) {
  player.media.currentTime = t;
  player.media.dispatchEvent(new Event('seeked'));
}

describe('Player', () => {
  it('builds the layout with labelled regions', () => {
    const { container, player } = mount();
    expect(container.querySelector('.zz-player[data-has-sidebar]')).not.toBeNull();
    expect(container.querySelectorAll('.zz-sidebar .zz-region')).toHaveLength(2);
    expect(container.querySelector('.zz-stage .zz-overlay--top-left')).not.toBeNull();
    expect(container.querySelector('[data-region="notes"]')!.getAttribute('aria-live')).toBe('polite');
    expect(container.querySelector('[data-region="transcript"]')!.hasAttribute('aria-live')).toBe(false);
    player.destroy();
    expect(container.childElementCount).toBe(0);
  });

  it('highlights the transcript line and seeks on click', () => {
    const { container, player } = mount();
    at(player, 6);
    const buttons = container.querySelectorAll<HTMLButtonElement>('.zz-transcript__seek');
    expect(buttons[1]!.getAttribute('aria-current')).toBe('true');
    expect(buttons[0]!.hasAttribute('aria-current')).toBe(false);
    buttons[0]!.click();
    expect(player.media.currentTime).toBe(0);
    expect(buttons[0]!.getAttribute('aria-current')).toBe('true');
    player.destroy();
  });

  it('shows the current chapter and transient elements', () => {
    const { container, player } = mount();
    at(player, 2);
    expect(container.querySelector('.zz-chapters__current')!.textContent).toBe('Chapter: One');
    const img = container.querySelector<HTMLImageElement>('.zz-image img')!;
    expect(img.alt).toBe('A shape');
    at(player, 7);
    expect(container.querySelector('.zz-image')).toBeNull();
    const link = container.querySelector<HTMLAnchorElement>('.zz-link a')!;
    expect(link.href).toBe('https://example.com/a');
    expect(link.rel).toBe('noopener noreferrer');
    expect(container.querySelector('.zz-chapters__current')!.textContent).toBe('Chapter: Two');
    player.destroy();
  });

  it('rejects invalid documents', () => {
    const bad = { ...doc, cues: [{ ...doc.cues[5]!, data: { src: 'a.svg' } }] };
    expect(() => mount(bad)).toThrow(CueFormatError);
  });

  it('supports custom element types', () => {
    const registry = createDefaultRegistry().register(
      transientPlugin<{ text: string }>('quote', (cue, ctx) => {
        const q = ctx.document.createElement('blockquote');
        q.textContent = cue.data.text;
        return q;
      }),
    );
    const cues: CueDocument = {
      version: 1,
      regions: [{ id: 'below', placement: 'below' }],
      cues: [{ id: 'q', start: 0, end: 2, type: 'quote', region: 'below', data: { text: 'Hello' } }],
    };
    const { container, player } = mount(cues, registry);
    at(player, 1);
    expect(container.querySelector('blockquote')!.textContent).toBe('Hello');
    player.destroy();
  });
});

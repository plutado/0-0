// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import '../src/element';

describe('<zero-zero-player>', () => {
  it('renders a player from a cueDocument property', async () => {
    const el = document.createElement('zero-zero-player');
    el.setAttribute('src', 'video.mp4');
    const ready = new Promise((resolve) => el.addEventListener('zz-ready', resolve));
    el.cueDocument = {
      version: 1,
      regions: [{ id: 'transcript', placement: 'sidebar' }],
      cues: [{ id: 'a', start: 0, end: 1, type: 'transcript', region: 'transcript', data: { text: 'Hi' } }],
    };
    document.body.append(el);
    await ready;
    expect(el.shadowRoot!.querySelector('.zz-transcript__seek')).not.toBeNull();
    expect(el.shadowRoot!.querySelector('video')!.getAttribute('src')).toBe('video.mp4');
    el.remove();
  });

  it('shows validation errors', async () => {
    const el = document.createElement('zero-zero-player');
    const failed = new Promise<CustomEvent>((resolve) => el.addEventListener('zz-error', (e) => resolve(e as CustomEvent)));
    el.cueDocument = { version: 1, regions: [], cues: [{ id: 'x' }] } as never;
    document.body.append(el);
    const event = await failed;
    expect(event.detail.issues.length).toBeGreaterThan(0);
    expect(el.shadowRoot!.querySelector('[role="alert"]')!.textContent).toContain('cues[0]');
    el.remove();
  });
});

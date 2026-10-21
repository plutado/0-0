import { describe, expect, it, vi } from 'vitest';
import { CueEngine, type MediaLike } from '../src/engine/engine';
import type { Cue } from '../src/format/types';

class FakeMedia implements MediaLike {
  currentTime = 0;
  paused = true;
  seeking = false;
  private listeners = new Map<string, Set<() => void>>();
  addEventListener(type: string, fn: () => void) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(fn);
  }
  removeEventListener(type: string, fn: () => void) {
    this.listeners.get(type)?.delete(fn);
  }
  fire(type: string) {
    for (const fn of this.listeners.get(type) ?? []) fn();
  }
  count() {
    return [...this.listeners.values()].reduce((n, s) => n + s.size, 0);
  }
}

const cue = (id: string, start: number, end: number): Cue => ({ id, start, end, type: 't', region: 'r', data: {} });

describe('CueEngine', () => {
  it('emits enter and exit from media events', () => {
    const media = new FakeMedia();
    const engine = new CueEngine(media, [cue('a', 1, 2), cue('b', 3, 4)]);
    const log: string[] = [];
    engine.on('cueenter', (e) => log.push(`+${e.cue.id}`));
    engine.on('cueexit', (e) => log.push(`-${e.cue.id}`));
    media.currentTime = 1.2;
    media.fire('timeupdate');
    media.currentTime = 3.5;
    media.fire('timeupdate');
    expect(log).toEqual(['+a', '-a', '+b']);
  });

  it('treats seeks as discontinuous', () => {
    const media = new FakeMedia();
    const engine = new CueEngine(media, [cue('flash', 1.1, 1.2)]);
    const passed = vi.fn();
    engine.on('cueenter', (e) => e.passed && passed());
    media.currentTime = 1.0;
    media.fire('timeupdate');
    media.fire('seeking');
    media.currentTime = 1.5;
    media.fire('timeupdate');
    media.fire('seeked');
    expect(passed).not.toHaveBeenCalled();
    media.currentTime = 1.0;
    media.fire('seeked');
    media.currentTime = 1.5;
    media.fire('timeupdate');
    expect(passed).toHaveBeenCalledOnce();
  });

  it('uses requestVideoFrameCallback when available', () => {
    const media = new FakeMedia() as FakeMedia & {
      requestVideoFrameCallback: (cb: (now: number, m: { mediaTime: number }) => void) => number;
      cancelVideoFrameCallback: (h: number) => void;
    };
    let pending: ((now: number, m: { mediaTime: number }) => void) | null = null;
    media.requestVideoFrameCallback = (cb) => {
      pending = cb;
      return 1;
    };
    media.cancelVideoFrameCallback = () => {
      pending = null;
    };
    const engine = new CueEngine(media, [cue('a', 0.5, 1)]);
    expect(engine.frameAccurate).toBe(true);
    const enter = vi.fn();
    engine.on('cueenter', enter);
    media.paused = false;
    media.fire('play');
    expect(pending).not.toBeNull();
    pending!(0, { mediaTime: 0.6 });
    expect(enter).toHaveBeenCalledOnce();
    media.paused = true;
    media.fire('pause');
    expect(pending).toBeNull();
  });

  it('seek() updates immediately and destroy() removes listeners', () => {
    const media = new FakeMedia();
    const engine = new CueEngine(media, [cue('a', 10, 20)]);
    engine.seek(12);
    expect(engine.active.map((c) => c.id)).toEqual(['a']);
    const exit = vi.fn();
    engine.on('cueexit', exit);
    engine.destroy();
    expect(exit).toHaveBeenCalledOnce();
    expect(media.count()).toBe(0);
  });
});

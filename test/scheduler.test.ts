import { describe, expect, it } from 'vitest';
import { CueScheduler } from '../src/engine/scheduler';

const cue = (id: string, start: number, end: number) => ({ id, start, end });
const ids = (list: { id: string }[]) => list.map((c) => c.id);

describe('CueScheduler', () => {
  const cues = [cue('a', 0, 2), cue('b', 1, 3), cue('short', 3.1, 3.2), cue('c', 5, 6)];

  it('reports enters and exits as time advances', () => {
    const s = new CueScheduler(cues);
    expect(ids(s.update(0.5).entered)).toEqual(['a']);
    const u = s.update(1.5, { continuous: true });
    expect(ids(u.entered)).toEqual(['b']);
    expect(u.exited).toEqual([]);
    const v = s.update(2.5, { continuous: true });
    expect(ids(v.exited)).toEqual(['a']);
    expect(ids(s.active)).toEqual(['b']);
  });

  it('reports cues skipped between updates during continuous playback', () => {
    const s = new CueScheduler(cues);
    s.update(2.9);
    const u = s.update(3.4, { continuous: true });
    expect(ids(u.passed)).toEqual(['short']);
    expect(ids(u.exited)).toEqual(['b']);
  });

  it('does not report passed cues for seeks or large jumps', () => {
    const s = new CueScheduler(cues);
    s.update(2.9);
    expect(s.update(3.4).passed).toEqual([]);
    const t = new CueScheduler(cues, { maxContinuousStep: 0.1 });
    t.update(2.9);
    expect(t.update(3.4, { continuous: true }).passed).toEqual([]);
  });

  it('handles seeking backwards', () => {
    const s = new CueScheduler(cues);
    s.update(5.5);
    const u = s.update(0.2, { continuous: true });
    expect(ids(u.exited)).toEqual(['c']);
    expect(ids(u.entered)).toEqual(['a']);
    expect(u.passed).toEqual([]);
  });

  it('keeps unchanged cues active when the cue set is replaced', () => {
    const s = new CueScheduler(cues);
    s.update(1.5);
    const exited = s.setCues([cues[0]!, cue('d', 1, 4)]);
    expect(ids(exited)).toEqual(['b']);
    expect(ids(s.update(1.5).entered)).toEqual(['d']);
  });

  it('reset exits everything', () => {
    const s = new CueScheduler(cues);
    s.update(1.5);
    expect(ids(s.reset())).toEqual(['a', 'b']);
    expect(s.active).toEqual([]);
  });
});

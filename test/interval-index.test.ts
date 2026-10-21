import { describe, expect, it } from 'vitest';
import { IntervalIndex } from '../src/engine/interval-index';

const iv = (id: string, start: number, end: number) => ({ id, start, end });

function bruteAt<T extends { start: number; end: number }>(items: T[], t: number) {
  return items.filter((i) => i.start <= t && t < i.end);
}

describe('IntervalIndex', () => {
  it('finds intervals containing a point with half-open bounds', () => {
    const index = new IntervalIndex([iv('a', 0, 5), iv('b', 3, 8), iv('c', 8, 10)]);
    expect(index.at(0).map((i) => i.id)).toEqual(['a']);
    expect(index.at(4).map((i) => i.id)).toEqual(['a', 'b']);
    expect(index.at(5).map((i) => i.id)).toEqual(['b']);
    expect(index.at(8).map((i) => i.id)).toEqual(['c']);
    expect(index.at(10)).toEqual([]);
  });

  it('finds intervals overlapping a range', () => {
    const index = new IntervalIndex([iv('a', 0, 1), iv('b', 1.2, 1.3), iv('c', 2, 3)]);
    expect(index.overlapping(1, 2).map((i) => i.id)).toEqual(['b']);
    expect(index.overlapping(0.5, 2.5).map((i) => i.id)).toEqual(['a', 'b', 'c']);
    expect(index.overlapping(2, 2)).toEqual([]);
  });

  it('matches a brute-force scan on random data', () => {
    let seed = 42;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const items = Array.from({ length: 2000 }, (_, i) => {
      const start = rand() * 1000;
      return iv(String(i), start, start + 0.01 + rand() * 30);
    });
    const index = new IntervalIndex(items);
    for (let k = 0; k < 200; k++) {
      const t = rand() * 1050;
      const got = index.at(t).map((i) => i.id).sort();
      const want = bruteAt(items, t).map((i) => i.id).sort();
      expect(got).toEqual(want);
    }
  });

  it('handles empty input', () => {
    const index = new IntervalIndex([]);
    expect(index.at(1)).toEqual([]);
    expect(index.size).toBe(0);
  });
});

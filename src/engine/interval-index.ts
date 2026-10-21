/**
 * A static interval index for answering "which intervals contain time t?"
 * and "which intervals overlap [a, b)?" quickly.
 *
 * Intervals are half-open: [start, end). They are sorted by start and laid
 * out as an implicit balanced binary search tree over the sorted array, where
 * each node also stores the largest end time in its subtree. A query skips
 * any subtree whose largest end is at or before the query time, and any
 * right subtree whose starts are all after it. Building is O(n log n);
 * queries are O(log n + k) for k results in typical cue data.
 *
 * The index is immutable. Rebuild it when the set of intervals changes;
 * at 10,000 cues a rebuild takes a few milliseconds.
 */

export interface Interval {
  start: number;
  end: number;
}

export class IntervalIndex<T extends Interval> {
  private readonly items: T[];
  private readonly maxEnd: Float64Array;

  constructor(items: Iterable<T>) {
    this.items = [...items].sort((a, b) => a.start - b.start || a.end - b.end);
    this.maxEnd = new Float64Array(this.items.length);
    this.build(0, this.items.length);
  }

  get size(): number {
    return this.items.length;
  }

  /** All intervals, sorted by start time. */
  all(): readonly T[] {
    return this.items;
  }

  /** Intervals with start <= t < end, in start order. */
  at(t: number): T[] {
    const out: T[] = [];
    this.collect(0, this.items.length, t, t, true, out);
    return out;
  }

  /** Intervals overlapping the half-open range [from, to), in start order. */
  overlapping(from: number, to: number): T[] {
    const out: T[] = [];
    if (to <= from) return out;
    this.collect(0, this.items.length, from, to, false, out);
    return out;
  }

  private build(lo: number, hi: number): number {
    if (lo >= hi) return -Infinity;
    const mid = (lo + hi) >>> 1;
    const own = this.items[mid]!.end;
    const left = this.build(lo, mid);
    const right = this.build(mid + 1, hi);
    const max = Math.max(own, left, right);
    this.maxEnd[mid] = max;
    return max;
  }

  private collect(lo: number, hi: number, from: number, to: number, point: boolean, out: T[]): void {
    if (lo >= hi) return;
    const mid = (lo + hi) >>> 1;
    // Nothing in this subtree ends after `from`.
    if (this.maxEnd[mid]! <= from) return;
    this.collect(lo, mid, from, to, point, out);
    const item = this.items[mid]!;
    // For a point query the start may equal t; for a range it must be < to.
    const startsInTime = point ? item.start <= from : item.start < to;
    if (!startsInTime) return; // every interval to the right starts even later
    if (item.end > from) out.push(item);
    this.collect(mid + 1, hi, from, to, point, out);
  }
}

import { IntervalIndex, type Interval } from './interval-index';

export interface SchedulerUpdate<T> {
  /** Media time the update was computed for, in seconds. */
  time: number;
  /** Cues that stopped being active, in start order. */
  exited: T[];
  /** Cues that became active, in start order. */
  entered: T[];
  /**
   * Cues that started and ended entirely between the previous update and
   * this one during continuous playback, so they were never observed as
   * active. Consumers that care about every cue (analytics, captions logs)
   * can treat these as an enter immediately followed by an exit.
   */
  passed: T[];
}

export interface UpdateOptions {
  /**
   * True when time advanced through normal playback rather than a seek.
   * Only continuous updates report `passed` cues.
   */
  continuous?: boolean;
}

export interface SchedulerOptions {
  /**
   * Largest forward step, in seconds, still treated as continuous playback.
   * Bigger jumps are handled like seeks. Defaults to 2.
   */
  maxContinuousStep?: number;
}

/**
 * Pure cue scheduling: given a stream of media times, works out which cues
 * enter and exit. Has no knowledge of the DOM or of media elements, so it can
 * be driven from tests, a server, or a non-browser renderer.
 */
export class CueScheduler<T extends Interval & { id: string }> {
  private index: IntervalIndex<T>;
  private activeById = new Map<string, T>();
  private lastTime: number | null = null;
  private readonly maxStep: number;

  constructor(cues: Iterable<T>, options: SchedulerOptions = {}) {
    this.index = new IntervalIndex(cues);
    this.maxStep = options.maxContinuousStep ?? 2;
  }

  /** Currently active cues, in start order. */
  get active(): T[] {
    return [...this.activeById.values()].sort((a, b) => a.start - b.start);
  }

  /** Time of the last update, or null before the first one. */
  get time(): number | null {
    return this.lastTime;
  }

  /** All cues, sorted by start time. */
  get cues(): readonly T[] {
    return this.index.all();
  }

  isActive(id: string): boolean {
    return this.activeById.has(id);
  }

  update(time: number, options: UpdateOptions = {}): SchedulerUpdate<T> {
    const previous = this.lastTime;
    const now = this.index.at(time);
    const nowIds = new Set(now.map((c) => c.id));

    const exited: T[] = [];
    for (const [id, cue] of this.activeById) {
      if (!nowIds.has(id)) exited.push(cue);
    }
    exited.sort((a, b) => a.start - b.start);

    const entered = now.filter((c) => !this.activeById.has(c.id));

    let passed: T[] = [];
    if (
      options.continuous &&
      previous !== null &&
      time > previous &&
      time - previous <= this.maxStep
    ) {
      passed = this.index
        .overlapping(previous, time)
        .filter((c) => !this.activeById.has(c.id) && !nowIds.has(c.id) && c.start > previous);
    }

    for (const cue of exited) this.activeById.delete(cue.id);
    for (const cue of entered) this.activeById.set(cue.id, cue);
    this.lastTime = time;

    return { time, exited, entered, passed };
  }

  /**
   * Replaces the cue set. Active cues that are gone (or changed) are reported
   * as exited; the next update() reports whatever is active in the new set.
   */
  setCues(cues: Iterable<T>): T[] {
    this.index = new IntervalIndex(cues);
    const exited = this.active;
    this.activeById.clear();
    if (this.lastTime !== null) {
      for (const cue of this.index.at(this.lastTime)) {
        const old = exited.findIndex((c) => c === cue);
        if (old !== -1) {
          exited.splice(old, 1);
          this.activeById.set(cue.id, cue);
        }
      }
    }
    return exited;
  }

  /** Deactivates everything, returning the cues that were active. */
  reset(): T[] {
    const exited = this.active;
    this.activeById.clear();
    this.lastTime = null;
    return exited;
  }
}

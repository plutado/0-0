import type { Cue } from '../format/types';
import { Emitter } from './emitter';
import { CueScheduler, type SchedulerOptions } from './scheduler';

/**
 * The subset of HTMLMediaElement the engine relies on. Any HTMLMediaElement
 * satisfies it, and so can a plain object in tests or a future adapter for
 * players that are not media elements (HLS wrappers, embedded players).
 */
export interface MediaLike {
  currentTime: number;
  readonly paused: boolean;
  readonly seeking?: boolean;
  addEventListener(type: string, listener: () => void): void;
  removeEventListener(type: string, listener: () => void): void;
}

interface VideoFrameMetadataLike {
  mediaTime: number;
}

interface VideoFrameCapable {
  requestVideoFrameCallback(cb: (now: number, metadata: VideoFrameMetadataLike) => void): number;
  cancelVideoFrameCallback(handle: number): void;
}

function supportsVideoFrames(media: unknown): media is VideoFrameCapable {
  return (
    typeof (media as Partial<VideoFrameCapable>).requestVideoFrameCallback === 'function' &&
    typeof (media as Partial<VideoFrameCapable>).cancelVideoFrameCallback === 'function'
  );
}

export interface CueEvent<T extends Cue = Cue> {
  cue: T;
  /** Media time, in seconds, at which the change was observed. */
  time: number;
  /**
   * True when the cue started and ended between two updates and was never
   * observed as active (a very short cue during fast playback).
   */
  passed: boolean;
}

export interface EngineEvents<T extends Cue = Cue> {
  [key: string]: unknown;
  cueenter: CueEvent<T>;
  cueexit: CueEvent<T>;
  /** Fired after each update with the current active set. */
  update: { time: number; active: T[] };
}

export interface EngineOptions extends SchedulerOptions {
  /**
   * Use requestVideoFrameCallback when the media element supports it, for
   * frame-accurate updates. Defaults to true. When false or unsupported the
   * engine relies on timeupdate (about four times a second).
   */
  videoFrameCallback?: boolean;
}

const MEDIA_EVENTS = [
  'timeupdate',
  'seeking',
  'seeked',
  'play',
  'playing',
  'pause',
  'ratechange',
  'loadedmetadata',
  'emptied',
] as const;

/**
 * Binds a CueScheduler to a media element and emits enter/exit events as the
 * active cue set changes.
 */
export class CueEngine<T extends Cue = Cue> {
  readonly media: MediaLike;
  private readonly scheduler: CueScheduler<T>;
  private readonly emitter = new Emitter<EngineEvents<T>>();
  private readonly useFrames: boolean;
  private frameHandle: number | null = null;
  private seekPending = false;
  private destroyed = false;
  private readonly handlers = new Map<string, () => void>();

  constructor(media: MediaLike, cues: Iterable<T>, options: EngineOptions = {}) {
    this.media = media;
    this.scheduler = new CueScheduler(cues, options);
    this.useFrames = (options.videoFrameCallback ?? true) && supportsVideoFrames(media);

    for (const type of MEDIA_EVENTS) {
      const handler = () => this.onMediaEvent(type);
      this.handlers.set(type, handler);
      media.addEventListener(type, handler);
    }
    if (!media.paused) this.startFrameLoop();
  }

  /** Subscribes to cueenter, cueexit or update. Returns an unsubscribe function. */
  on<K extends keyof EngineEvents<T>>(type: K, listener: (payload: EngineEvents<T>[K]) => void): () => void {
    return this.emitter.on(type, listener);
  }

  get active(): T[] {
    return this.scheduler.active;
  }

  get cues(): readonly T[] {
    return this.scheduler.cues;
  }

  /** True when frame-accurate updates via requestVideoFrameCallback are in use. */
  get frameAccurate(): boolean {
    return this.useFrames;
  }

  /** Recomputes the active set from the media's current time. */
  refresh(): void {
    this.tick(this.media.currentTime, false);
  }

  /** Seeks the media and updates immediately so the UI responds without waiting for events. */
  seek(time: number): void {
    this.media.currentTime = Math.max(0, time);
    this.tick(this.media.currentTime, false);
  }

  /** Replaces the cues, emitting exits for cues that disappeared and enters for new ones. */
  setCues(cues: Iterable<T>): void {
    const time = this.media.currentTime;
    for (const cue of this.scheduler.setCues(cues)) {
      this.emitter.emit('cueexit', { cue, time, passed: false });
    }
    this.tick(time, false);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.stopFrameLoop();
    for (const [type, handler] of this.handlers) this.media.removeEventListener(type, handler);
    this.handlers.clear();
    const time = this.media.currentTime;
    for (const cue of this.scheduler.reset()) this.emitter.emit('cueexit', { cue, time, passed: false });
    this.emitter.clear();
  }

  private onMediaEvent(type: (typeof MEDIA_EVENTS)[number]): void {
    switch (type) {
      case 'seeking':
        this.seekPending = true;
        this.tick(this.media.currentTime, false);
        return;
      case 'seeked':
        this.seekPending = false;
        this.tick(this.media.currentTime, false);
        return;
      case 'play':
      case 'playing':
        this.startFrameLoop();
        this.tick(this.media.currentTime, true);
        return;
      case 'pause':
        this.stopFrameLoop();
        this.tick(this.media.currentTime, true);
        return;
      case 'emptied':
      case 'loadedmetadata':
        this.tick(this.media.currentTime, false);
        return;
      default:
        // timeupdate, ratechange
        this.tick(this.media.currentTime, true);
    }
  }

  private tick(time: number, continuous: boolean): void {
    if (this.destroyed || !Number.isFinite(time)) return;
    const isContinuous = continuous && !this.seekPending && this.media.seeking !== true;
    const { entered, exited, passed } = this.scheduler.update(time, { continuous: isContinuous });
    for (const cue of exited) this.emitter.emit('cueexit', { cue, time, passed: false });
    for (const cue of passed) {
      this.emitter.emit('cueenter', { cue, time, passed: true });
      this.emitter.emit('cueexit', { cue, time, passed: true });
    }
    for (const cue of entered) this.emitter.emit('cueenter', { cue, time, passed: false });
    if (entered.length || exited.length || passed.length) {
      this.emitter.emit('update', { time, active: this.scheduler.active });
    }
  }

  private startFrameLoop(): void {
    if (!this.useFrames || this.frameHandle !== null || this.destroyed) return;
    const media = this.media as unknown as VideoFrameCapable;
    const step = (_now: number, metadata: VideoFrameMetadataLike) => {
      this.frameHandle = null;
      this.tick(metadata.mediaTime, true);
      if (!this.media.paused && !this.destroyed) this.frameHandle = media.requestVideoFrameCallback(step);
    };
    this.frameHandle = media.requestVideoFrameCallback(step);
  }

  private stopFrameLoop(): void {
    if (this.frameHandle === null) return;
    (this.media as unknown as VideoFrameCapable).cancelVideoFrameCallback(this.frameHandle);
    this.frameHandle = null;
  }
}

import type { Cue, Region } from '../format/types';
import type { DataValidator } from '../format/validate';

/** Services the player gives each element plugin. */
export interface ElementContext {
  readonly document: Document;
  /** The region this plugin instance renders into. */
  readonly region: Region;
  /** Seeks the media to a time in seconds. */
  seek(time: number): void;
  /** Current media time in seconds. */
  currentTime(): number;
  /** True when the user has asked for reduced motion. */
  prefersReducedMotion(): boolean;
  /** Resolves a URL from the cue document relative to where it was loaded. */
  resolveUrl(url: string): string;
}

/** A mounted plugin instance for one region. */
export interface ElementView<TData = unknown> {
  enter(cue: Cue<TData>): void;
  exit(cue: Cue<TData>): void;
  destroy(): void;
}

/**
 * An element type. The player calls mount() once per region that has cues of
 * this type, passing every such cue up front, so persistent elements
 * (transcripts, chapter lists) can render everything and transient ones
 * (images, cards) can render on enter.
 */
export interface ElementPlugin<TData = unknown> {
  readonly type: string;
  /** Optional payload check used by validateCueDocument. */
  readonly validate?: DataValidator;
  mount(container: HTMLElement, cues: readonly Cue<TData>[], context: ElementContext): ElementView<TData>;
}

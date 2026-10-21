import { CueEngine, type EngineEvents, type EngineOptions } from '../engine/engine';
import { createDefaultRegistry, type ElementRegistry } from '../elements/registry';
import type { ElementContext, ElementView } from '../elements/types';
import type { Cue, CueDocument, Region } from '../format/types';
import { assertCueDocument } from '../format/validate';
import { playerStyles } from './styles';

export type Theme = 'auto' | 'light' | 'dark';

export interface PlayerOptions extends EngineOptions {
  /** Element (or shadow root) the player renders into. */
  container: HTMLElement | ShadowRoot;
  /** The cue document. It is validated against the registry's plugins. */
  cues: CueDocument;
  /** An existing media element. If omitted, a <video controls> is created. */
  media?: HTMLMediaElement;
  /** Media URL for the created video. Ignored when `media` is given. */
  src?: string;
  poster?: string;
  /**
   * Node placed in the stage instead of moving `media` there, e.g. a <slot>
   * when the media element lives in a Web Component's light DOM.
   */
  mediaPlaceholder?: Node;
  /** Element types. Defaults to the built-in types. */
  registry?: ElementRegistry;
  /** Base for relative URLs in the cue document. Defaults to the page URL. */
  baseUrl?: string;
  theme?: Theme;
  /** Seek here once metadata has loaded, in seconds. */
  startTime?: number;
  /** Add the player stylesheet to the container's root. Defaults to true. */
  injectStyles?: boolean;
}

const STYLE_ID = 'zero-zero-player-styles';

function injectStylesInto(root: Document | ShadowRoot): void {
  if (root instanceof ShadowRoot) {
    if (root.querySelector(`style[data-zz]`)) return;
    const style = root.ownerDocument.createElement('style');
    style.dataset.zz = '';
    style.textContent = playerStyles;
    root.prepend(style);
    return;
  }
  if (root.getElementById(STYLE_ID)) return;
  const style = root.createElement('style');
  style.id = STYLE_ID;
  style.textContent = playerStyles;
  root.head.append(style);
}

/**
 * A mounted player: media, regions, element plugins and the cue engine wired
 * together. Create one with createPlayer() or use <zero-zero-player>.
 */
export class Player {
  readonly root: HTMLDivElement;
  readonly media: HTMLMediaElement;
  readonly engine: CueEngine;
  readonly cues: CueDocument;
  private readonly views = new Map<string, ElementView>();
  private readonly mounted: ElementView[] = [];
  private readonly ownsMedia: boolean;
  private readonly cleanups: (() => void)[] = [];

  constructor(options: PlayerOptions) {
    const registry = options.registry ?? createDefaultRegistry();
    this.cues = assertCueDocument(options.cues, { dataValidators: registry.dataValidators() });
    const container = options.container;
    const doc = container.ownerDocument;

    if (options.injectStyles !== false) {
      injectStylesInto(container instanceof ShadowRoot ? container : doc);
    }

    this.ownsMedia = !options.media;
    this.media = options.media ?? this.createVideo(doc, options);

    const root = doc.createElement('div');
    root.className = 'zz-player';
    root.dataset.theme = options.theme ?? 'auto';
    if (this.cues.metadata?.language) root.lang = this.cues.metadata.language;
    this.root = root;

    const stage = doc.createElement('div');
    stage.className = 'zz-stage';
    stage.append(options.mediaPlaceholder ?? this.media);
    root.append(stage);

    const sidebarInner = doc.createElement('div');
    sidebarInner.className = 'zz-sidebar__inner';
    const below = doc.createElement('div');
    below.className = 'zz-below';

    const regionEls = new Map<string, HTMLElement>();
    for (const region of this.cues.regions) {
      const el = this.createRegion(doc, region);
      regionEls.set(region.id, el);
      if (region.placement === 'overlay') stage.append(el);
      else if (region.placement === 'sidebar') sidebarInner.append(el);
      else below.append(el);
    }
    if (sidebarInner.childElementCount > 0) {
      const sidebar = doc.createElement('aside');
      sidebar.className = 'zz-sidebar';
      sidebar.setAttribute('aria-label', 'Companion content');
      sidebar.append(sidebarInner);
      root.append(sidebar);
      root.dataset.hasSidebar = '';
    }
    root.append(below);

    this.engine = new CueEngine(this.media, this.cues.cues, options);

    const baseUrl = options.baseUrl ?? doc.baseURI;
    const reducedMotion = doc.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)');

    // Group cues by region, then by type, and mount one plugin view per group.
    const groups = new Map<string, Map<string, Cue[]>>();
    for (const cue of this.cues.cues) {
      let byType = groups.get(cue.region);
      if (!byType) groups.set(cue.region, (byType = new Map()));
      let list = byType.get(cue.type);
      if (!list) byType.set(cue.type, (list = []));
      list.push(cue);
    }
    const warned = new Set<string>();
    for (const region of this.cues.regions) {
      const el = regionEls.get(region.id)!;
      for (const [type, cues] of groups.get(region.id) ?? []) {
        const plugin = registry.get(type);
        if (!plugin) {
          if (!warned.has(type)) console.warn(`[0-0] No element plugin registered for cue type "${type}"; skipping.`);
          warned.add(type);
          continue;
        }
        if (type === 'transcript') el.dataset.grow = '';
        const context: ElementContext = {
          document: doc,
          region,
          seek: (t) => this.seek(t),
          currentTime: () => this.media.currentTime,
          prefersReducedMotion: () => reducedMotion?.matches ?? false,
          resolveUrl: (url) => {
            try {
              return new URL(url, baseUrl).href;
            } catch {
              return url;
            }
          },
        };
        const view = plugin.mount(el, cues, context);
        this.mounted.push(view);
        for (const cue of cues) this.views.set(cue.id, view);
      }
    }

    // Passed cues (shorter than one update interval) are not rendered.
    this.cleanups.push(
      this.engine.on('cueenter', ({ cue, passed }) => {
        if (!passed) this.views.get(cue.id)?.enter(cue);
      }),
      this.engine.on('cueexit', ({ cue, passed }) => {
        if (!passed) this.views.get(cue.id)?.exit(cue);
      }),
    );

    container.append(root);

    if (options.startTime !== undefined && options.startTime > 0) {
      const start = options.startTime;
      if (this.media.readyState >= 1) this.seek(start);
      else {
        const onMeta = () => this.seek(start);
        this.media.addEventListener('loadedmetadata', onMeta, { once: true });
        this.cleanups.push(() => this.media.removeEventListener('loadedmetadata', onMeta));
      }
    }
    this.engine.refresh();
  }

  /** Subscribes to engine events: cueenter, cueexit, update. */
  on<K extends keyof EngineEvents>(type: K, listener: (payload: EngineEvents[K]) => void): () => void {
    return this.engine.on(type, listener);
  }

  seek(time: number): void {
    this.engine.seek(time);
  }

  play(): Promise<void> {
    return this.media.play();
  }

  pause(): void {
    this.media.pause();
  }

  setTheme(theme: Theme): void {
    this.root.dataset.theme = theme;
  }

  destroy(): void {
    for (const cleanup of this.cleanups.splice(0)) cleanup();
    this.engine.destroy();
    for (const view of this.mounted.splice(0)) view.destroy();
    this.views.clear();
    if (this.ownsMedia) this.media.pause();
    this.root.remove();
  }

  private createVideo(doc: Document, options: PlayerOptions): HTMLVideoElement {
    const video = doc.createElement('video');
    video.controls = true;
    video.playsInline = true;
    video.preload = 'metadata';
    if (options.poster) video.poster = options.poster;
    if (options.src) video.src = options.src;
    if (this.cues.metadata?.title) video.setAttribute('aria-label', this.cues.metadata.title);
    return video;
  }

  private createRegion(doc: Document, region: Region): HTMLElement {
    const el = doc.createElement(region.placement === 'overlay' ? 'div' : 'section');
    el.className = `zz-region zz-region--${region.placement}`;
    if (region.placement === 'overlay') {
      el.className = `zz-overlay zz-overlay--${region.position ?? 'top-right'}`;
    }
    el.dataset.region = region.id;
    if (region.label) {
      const id = `zz-region-${region.id}-${Math.random().toString(36).slice(2, 8)}`;
      if (region.placement === 'overlay') {
        el.setAttribute('aria-label', region.label);
        el.setAttribute('role', 'group');
      } else {
        const heading = doc.createElement('h2');
        heading.className = 'zz-region__label';
        heading.id = id;
        heading.textContent = region.label;
        el.append(heading);
        el.setAttribute('aria-labelledby', id);
      }
    }
    if (region.announce) {
      el.setAttribute('aria-live', 'polite');
      el.setAttribute('aria-relevant', 'additions');
    }
    return el;
  }
}

/** Mounts a player. Throws a CueFormatError if the cue document is invalid. */
export function createPlayer(options: PlayerOptions): Player {
  return new Player(options);
}

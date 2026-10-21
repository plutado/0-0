import { createDefaultRegistry, type ElementRegistry } from './elements/registry';
import type { CueDocument } from './format/types';
import { CueFormatError } from './format/validate';
import { loadCueDocument, loadTranscript } from './player/load';
import { Player, type Theme } from './player/player';
import { playerStyles } from './player/styles';

const HTMLElementBase: typeof HTMLElement =
  typeof HTMLElement === 'undefined' ? (class {} as unknown as typeof HTMLElement) : HTMLElement;

/**
 * <zero-zero-player src="video.mp4" cues="cues.json" transcript="captions.vtt">
 *
 * Attributes:
 *   src         media URL (ignored when a <video> or <audio> child is given)
 *   cues        URL of a cue document (JSON)
 *   transcript  URL of a WebVTT captions file, shown as an interactive transcript
 *   poster      poster image for the created video
 *   theme       "auto" (default), "light" or "dark"
 *   start       start time in seconds
 *   muted, autoplay, loop  passed to the created video
 *
 * Events (bubbling, composed): zz-ready, zz-error, cueenter, cueexit.
 * The element's `cueDocument` property accepts a document object directly.
 */
export class ZeroZeroPlayerElement extends HTMLElementBase {
  static readonly observedAttributes = ['src', 'cues', 'transcript', 'poster', 'theme', 'start'];

  /** Element types used by this instance; register custom plugins before connecting. */
  registry: ElementRegistry = createDefaultRegistry();

  private _player: Player | null = null;
  private _document: CueDocument | null = null;
  private loadToken = 0;
  private scheduled = false;

  get player(): Player | null {
    return this._player;
  }

  get cueDocument(): CueDocument | null {
    return this._document;
  }

  set cueDocument(value: CueDocument | null) {
    this._document = value;
    this.scheduleRender();
  }

  connectedCallback(): void {
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    this.scheduleRender();
  }

  disconnectedCallback(): void {
    this.loadToken++;
    this._player?.destroy();
    this._player = null;
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (oldValue === newValue || !this.isConnected) return;
    if (name === 'theme' && this._player) {
      this._player.setTheme(this.theme);
      return;
    }
    if (name === 'cues') this._document = null;
    this.scheduleRender();
  }

  private get theme(): Theme {
    const t = this.getAttribute('theme');
    return t === 'light' || t === 'dark' ? t : 'auto';
  }

  private scheduleRender(): void {
    if (this.scheduled) return;
    this.scheduled = true;
    queueMicrotask(() => {
      this.scheduled = false;
      if (this.isConnected) void this.render();
    });
  }

  private async render(): Promise<void> {
    const token = ++this.loadToken;
    const shadow = this.shadowRoot!;
    try {
      const cuesUrl = this.getAttribute('cues');
      const transcriptUrl = this.getAttribute('transcript');
      const validators = { dataValidators: this.registry.dataValidators() };
      let doc = this._document;
      const fromUrl = !doc && cuesUrl;
      if (!doc && cuesUrl) doc = await loadCueDocument(new URL(cuesUrl, document.baseURI).href, validators);
      if (transcriptUrl) doc = await loadTranscript(new URL(transcriptUrl, document.baseURI).href, doc ?? undefined);
      if (token !== this.loadToken) return;
      if (!doc) doc = { version: 1, regions: [], cues: [] };

      this._player?.destroy();
      shadow.replaceChildren();

      const child = this.querySelector<HTMLMediaElement>(':scope > video, :scope > audio');
      const start = Number(this.getAttribute('start'));
      const slot = child ? document.createElement('slot') : undefined;
      this._player = new Player({
        container: shadow,
        cues: doc,
        registry: this.registry,
        theme: this.theme,
        ...(child ? { media: child, mediaPlaceholder: slot } : {}),
        ...(this.getAttribute('src') ? { src: this.getAttribute('src')! } : {}),
        ...(this.getAttribute('poster') ? { poster: this.getAttribute('poster')! } : {}),
        ...(Number.isFinite(start) && start > 0 ? { startTime: start } : {}),
        ...(fromUrl ? { baseUrl: new URL(cuesUrl, document.baseURI).href } : {}),
      });
      if (!child) {
        const media = this._player.media;
        media.muted = this.hasAttribute('muted');
        media.loop = this.hasAttribute('loop');
        if (this.hasAttribute('autoplay')) media.autoplay = true;
      }
      this._player.on('cueenter', (detail) => this.dispatch('cueenter', detail));
      this._player.on('cueexit', (detail) => this.dispatch('cueexit', detail));
      this.dispatch('zz-ready', { player: this._player });
    } catch (error) {
      if (token !== this.loadToken) return;
      this.showError(error);
    }
  }

  private showError(error: unknown): void {
    const shadow = this.shadowRoot!;
    shadow.replaceChildren();
    const style = document.createElement('style');
    style.textContent = playerStyles;
    const box = document.createElement('div');
    box.className = 'zz-player';
    const message = document.createElement('div');
    message.className = 'zz-error';
    message.setAttribute('role', 'alert');
    message.textContent = error instanceof Error ? error.message : String(error);
    box.append(message);
    shadow.append(style, box);
    this.dispatch('zz-error', {
      error,
      issues: error instanceof CueFormatError ? error.issues : undefined,
    });
  }

  private dispatch(type: string, detail: unknown): void {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }
}

export const ELEMENT_NAME = 'zero-zero-player';

/** Registers <zero-zero-player> if it is not already defined. */
export function defineZeroZeroPlayer(name: string = ELEMENT_NAME): void {
  if (typeof customElements === 'undefined') return;
  if (!customElements.get(name)) customElements.define(name, ZeroZeroPlayerElement);
}

defineZeroZeroPlayer();

declare global {
  interface HTMLElementTagNameMap {
    'zero-zero-player': ZeroZeroPlayerElement;
  }
}

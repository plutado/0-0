/**
 * Player styles. Every colour and size is read from a public custom property
 * (--zz-*) with a fallback, so pages can theme the player from outside,
 * including through the Web Component's shadow root.
 *
 * Public properties: --zz-font, --zz-bg, --zz-surface, --zz-fg, --zz-muted,
 * --zz-accent, --zz-accent-fg, --zz-active-bg, --zz-border, --zz-focus,
 * --zz-radius, --zz-gap, --zz-aspect-ratio, --zz-sidebar-width, --zz-stack-below.
 */
export const playerStyles = /* css */ `
.zz-player {
  --_font: var(--zz-font, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif);
  --_bg: var(--zz-bg, #ffffff);
  --_surface: var(--zz-surface, #f4f4f6);
  --_fg: var(--zz-fg, #17171c);
  --_muted: var(--zz-muted, #5b5b66);
  --_accent: var(--zz-accent, #2952cc);
  --_accent-fg: var(--zz-accent-fg, #ffffff);
  --_active-bg: var(--zz-active-bg, #e3e9fb);
  --_border: var(--zz-border, #d9d9e0);
  --_focus: var(--zz-focus, #2952cc);
  --_radius: var(--zz-radius, 10px);
  --_gap: var(--zz-gap, 16px);
  --_sidebar: var(--zz-sidebar-width, minmax(260px, 34%));

  container-type: inline-size;
  box-sizing: border-box;
  font-family: var(--_font);
  font-size: 15px;
  line-height: 1.45;
  color: var(--_fg);
  background: var(--_bg);
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-areas: "stage" "below";
  gap: var(--_gap);
}
.zz-player *, .zz-player *::before, .zz-player *::after { box-sizing: inherit; }

.zz-player[data-theme="dark"] {
  --_bg: var(--zz-bg, #121218);
  --_surface: var(--zz-surface, #1d1d26);
  --_fg: var(--zz-fg, #ececf1);
  --_muted: var(--zz-muted, #a4a4b2);
  --_accent: var(--zz-accent, #8fa8ff);
  --_accent-fg: var(--zz-accent-fg, #10121c);
  --_active-bg: var(--zz-active-bg, #29304a);
  --_border: var(--zz-border, #33333f);
  --_focus: var(--zz-focus, #8fa8ff);
}
@media (prefers-color-scheme: dark) {
  .zz-player[data-theme="auto"] {
    --_bg: var(--zz-bg, #121218);
    --_surface: var(--zz-surface, #1d1d26);
    --_fg: var(--zz-fg, #ececf1);
    --_muted: var(--zz-muted, #a4a4b2);
    --_accent: var(--zz-accent, #8fa8ff);
    --_accent-fg: var(--zz-accent-fg, #10121c);
    --_active-bg: var(--zz-active-bg, #29304a);
    --_border: var(--zz-border, #33333f);
    --_focus: var(--zz-focus, #8fa8ff);
  }
}

.zz-player[data-has-sidebar] {
  grid-template-columns: minmax(0, 1fr) var(--_sidebar);
  grid-template-areas: "stage sidebar" "below below";
}

.zz-stage { grid-area: stage; position: relative; background: #000; border-radius: var(--_radius); overflow: hidden; align-self: start; }
.zz-stage video, .zz-stage audio, .zz-stage ::slotted(video), .zz-stage ::slotted(audio) { display: block; width: 100%; height: auto; }
.zz-stage video { aspect-ratio: var(--zz-aspect-ratio, 16 / 9); object-fit: contain; background: #000; }
.zz-stage audio, .zz-stage ::slotted(audio) { background: var(--_surface); }

/* The sidebar takes the stage's height and scrolls internally. */
.zz-sidebar { grid-area: sidebar; position: relative; min-height: 0; }
.zz-sidebar__inner { position: absolute; inset: 0; display: flex; flex-direction: column; gap: var(--_gap); }
.zz-below { grid-area: below; display: grid; gap: var(--_gap); }
.zz-below:empty { display: none; }

.zz-region {
  position: relative;
  background: var(--_surface);
  border: 1px solid var(--_border);
  border-radius: var(--_radius);
  padding: 12px;
  min-height: 0;
}
.zz-sidebar .zz-region { overflow: auto; overscroll-behavior: contain; flex: 0 1 auto; }
.zz-sidebar .zz-region[data-grow] { flex: 1 1 0; }
.zz-region__label { margin: 0 0 8px; font-size: 0.78rem; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: var(--_muted); }

/* Overlays sit over the video but leave the native controls clickable. */
.zz-overlay { position: absolute; z-index: 2; max-width: min(40%, 320px); pointer-events: none; }
.zz-overlay > * { pointer-events: auto; }
.zz-overlay--top-left { top: 12px; left: 12px; }
.zz-overlay--top-right { top: 12px; right: 12px; }
.zz-overlay--bottom-left { bottom: 56px; left: 12px; }
.zz-overlay--bottom-right { bottom: 56px; right: 12px; }
.zz-overlay--center { top: 50%; left: 50%; transform: translate(-50%, -50%); }
.zz-overlay .zz-item { background: color-mix(in srgb, var(--_bg) 88%, transparent); color: var(--_fg); border-radius: var(--_radius); padding: 8px; box-shadow: 0 4px 18px rgb(0 0 0 / 0.25); }

.zz-stack { display: grid; gap: 10px; }
.zz-item { animation: zz-in 220ms ease-out; }
@keyframes zz-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }

/* Narrow players stack the sidebar under the video. */
@container (max-width: 720px) {
  .zz-player[data-has-sidebar] {
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas: "stage" "sidebar" "below";
  }
  .zz-sidebar__inner { position: static; }
  .zz-sidebar .zz-region[data-grow] { max-height: var(--zz-stack-below, 45vh); flex: none; }
  .zz-overlay { max-width: 55%; }
}

.zz-player button { font: inherit; color: inherit; }
.zz-player :focus-visible { outline: 3px solid var(--_focus); outline-offset: 2px; border-radius: 4px; }
.zz-player a { color: var(--_accent); }

/* Transcript */
.zz-transcript, .zz-chapters__list { list-style: none; margin: 0; padding: 0; }
.zz-transcript__seek, .zz-chapters__seek {
  display: flex; gap: 10px; align-items: baseline; width: 100%;
  text-align: start; background: none; border: 0; border-radius: 6px;
  padding: 6px 8px; cursor: pointer;
}
.zz-transcript__seek:hover, .zz-chapters__seek:hover { background: color-mix(in srgb, var(--_accent) 10%, transparent); }
.zz-transcript__time, .zz-chapters__time { flex: none; font-variant-numeric: tabular-nums; font-size: 0.8rem; color: var(--_muted); min-width: 2.6em; }
.zz-transcript__speaker { font-weight: 600; }
.zz-transcript__line.zz-active .zz-transcript__seek { background: var(--_active-bg); box-shadow: inset 3px 0 0 var(--_accent); }

/* Chapters */
.zz-chapters__current { margin: 0 0 6px; font-weight: 600; }
.zz-chapters__current:empty { display: none; }
.zz-chapters__seek[aria-current="true"] { background: var(--_active-bg); font-weight: 600; }

/* Images */
.zz-image { margin: 0; }
.zz-image img { display: block; max-width: 100%; height: auto; border-radius: calc(var(--_radius) - 4px); }
.zz-image figcaption { margin-top: 6px; font-size: 0.85rem; color: var(--_muted); }
.zz-credit { display: block; font-size: 0.75rem; }

/* Link cards */
.zz-link { background: var(--_bg); border: 1px solid var(--_border); border-radius: calc(var(--_radius) - 2px); padding: 10px 12px; }
.zz-link__source { margin: 0; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--_muted); }
.zz-link__title { margin: 2px 0 0; font-size: 1rem; }
.zz-link__summary { margin: 4px 0 0; font-size: 0.9rem; color: var(--_muted); }

.zz-error { padding: 12px; border: 1px solid #c62828; border-radius: var(--_radius); color: #c62828; white-space: pre-wrap; font-family: ui-monospace, monospace; font-size: 0.85rem; }

.zz-visually-hidden {
  position: absolute !important; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}

@media (prefers-reduced-motion: reduce) {
  .zz-item { animation: none; }
  .zz-player * { scroll-behavior: auto !important; transition: none !important; }
}
`;

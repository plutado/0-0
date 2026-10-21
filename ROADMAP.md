# Roadmap

Estimates are working hours and will be revised as the work is understood. Remaining work totals about **266 hours**.

## Milestone 0: Foundation (done)

- [x] Cue document format v1 and validator (6 h)
- [x] WebVTT import (captions and metadata) and transcript export (5 h)
- [x] Interval index, scheduler and media engine (8 h)
- [x] Transcript, image, link card and chapters elements (8 h)
- [x] Sidebar, below and overlay layouts; theming; reduced motion (5 h)
- [x] Web Component and programmatic API (4 h)
- [x] Synthetic demo, CI and Pages deployment (4 h)

## Milestone 1: More element types (24 h)

- [ ] Quote element with attribution (3 h)
- [ ] Footnote element with numbered markers linked from the transcript (5 h)
- [ ] Map element using a static image plus an optional embed, with text alternative (6 h)
- [ ] Code snippet element with copy button and no-dependency highlighting (4 h)
- [ ] Poll element with a pluggable results backend (6 h)

## Milestone 2: Media adapters (24 h)

- [ ] Adapter interface documented and tested against `MediaLike` (3 h)
- [ ] HLS adapter that defers to native HLS or a user-supplied hls.js instance (6 h)
- [ ] YouTube IFrame API adapter (time polling, seeks, rate changes) (7 h)
- [ ] Vimeo Player API adapter (6 h)
- [ ] Adapter examples in the demo (2 h)

## Milestone 3: Visual cue editor with timeline (60 h)

- [ ] Editor shell: load media and a cue document, preview with the real player (8 h)
- [ ] Timeline with zoom, scrubbing and a playhead synced to the media (12 h)
- [ ] Cue lanes per region; drag to move, drag edges to trim, snapping to other cues (12 h)
- [ ] Data forms generated from each element type's schema (8 h)
- [ ] Undo/redo and keyboard editing of selected cues (6 h)
- [ ] Live validation with errors linked to the offending cue (4 h)
- [ ] Import and export: JSON, WebVTT captions and metadata tracks (4 h)
- [ ] Editor accessibility: keyboard-only timeline editing and announcements (6 h)

## Milestone 4: Cue authoring from transcripts (16 h)

- [ ] Markup convention for links, images and chapters inside transcript text (4 h)
- [ ] Converter from marked-up transcript to cue document, with a CLI (6 h)
- [ ] Chapter suggestions from speaker changes and long pauses (4 h)
- [ ] Docs and examples (2 h)

## Milestone 5: Export and embed (14 h)

- [ ] Embed snippet generator (script tag plus element, with options) (4 h)
- [ ] Self-contained static export of a player page (6 h)
- [ ] oEmbed-style metadata for sharing (4 h)

## Milestone 6: Languages and i18n (14 h)

- [ ] Multiple transcript tracks with a language switcher (6 h)
- [ ] Translatable UI strings (chapter label, "opens in a new tab", time phrases) (4 h)
- [ ] Right-to-left layout support (4 h)

## Milestone 7: Accessibility audit (16 h)

- [ ] Screen reader passes with VoiceOver, NVDA and TalkBack; record findings (6 h)
- [ ] Keyboard shortcuts for previous/next cue and chapter, documented (4 h)
- [ ] Contrast checks for both themes and forced-colors mode (3 h)
- [ ] Fixes from the audit (3 h)

## Milestone 8: Performance (14 h)

- [ ] Benchmarks with 10,000 and 100,000 cues (3 h)
- [ ] Virtualised transcript rendering for long transcripts (6 h)
- [ ] Incremental index updates for live editing (5 h)

## Milestone 9: Testing and release (20 h)

- [ ] Playwright browser test that plays the demo and checks a cue appears (4 h)
- [ ] Cross-browser runs in CI (Chromium, Firefox, WebKit) (4 h)
- [ ] Publish to npm with provenance; versioned docs (4 h)
- [ ] JSON Schema for the cue format, for editor tooling (4 h)
- [ ] Cue format v2 planning: migration path and validator support (4 h)

## Milestone 10: Docs site at 0-0.in (16 h)

- [ ] Site structure: guide, cue format, API reference, examples (6 h)
- [ ] API reference generated from TypeScript types (4 h)
- [ ] Interactive cue playground (4 h)
- [ ] Custom domain and redirects from GitHub Pages (2 h)

## Milestone 11: Integrations (48 h)

- [ ] WordPress block that renders `<zero-zero-player>` (12 h)
- [ ] Drupal module and field formatter (12 h)
- [ ] Static site generator examples (Astro, Eleventy) (8 h)
- [ ] Analytics hooks: cue views and link clicks without tracking by default (8 h)
- [ ] Print and reading view: transcript with sources as an article (8 h)

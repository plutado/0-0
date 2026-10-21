# System design

0-0 is layered so that each part can be used and tested on its own.

```
cue document (JSON / WebVTT)
        |
   validator  ------------------  format/validate.ts, vtt/vtt.ts
        |
  IntervalIndex -> CueScheduler   engine/  (pure, no DOM)
        |
    CueEngine  <---- media element (anything matching MediaLike)
        |  cueenter / cueexit
     Player  ---- ElementRegistry -> plugins (transcript, image, link, chapter)
        |
 <zero-zero-player>               element.ts (Web Component)
```

## Format layer

`src/format/` defines the types and the validator. The validator has no DOM dependency, collects every issue with a path, and takes per-type payload checks so plugins can add their own. URLs in images and links are restricted to http(s) and relative references.

`src/vtt/` parses WebVTT into blocks and converts them to cues. It is deliberately small: it handles the cue structure, voices and entities, and ignores styling, which the player does not use.

## Scheduling

`IntervalIndex` sorts cues by start and treats the sorted array as an implicit balanced tree, with each node storing the largest end time beneath it. Point and range queries prune whole subtrees, giving O(log n + k) lookups. It is rebuilt when cues change, which is cheap (milliseconds for ten thousand cues). See [decision 0003](decisions/0003-static-interval-index.md).

`CueScheduler` holds the active set. Each `update(time, { continuous })` returns the cues that exited and entered, and, during continuous forward playback, cues that started and ended between two updates (`passed`). Seeks and large jumps never produce `passed` cues. It knows nothing about media elements, so it is tested with plain numbers.

## Engine

`CueEngine` connects a scheduler to a media element through the `MediaLike` interface (current time, paused, seeking, events). It:

- listens for `timeupdate`, `seeking`, `seeked`, `play`, `pause`, `ratechange`, `loadedmetadata` and `emptied`;
- runs a `requestVideoFrameCallback` loop while playing when the element supports it, using the frame's `mediaTime` for accuracy, and falls back to `timeupdate` otherwise;
- treats updates during a seek as discontinuous;
- emits `cueenter`, `cueexit` and `update`, isolating listener errors so one bad listener cannot stop playback updates.

Because the engine depends only on `MediaLike`, adapters for embedded players (YouTube, Vimeo) can be added without changing it.

## Elements

An element plugin has a `type`, an optional payload `validate`, and `mount(container, cues, context)`, which returns a view with `enter`, `exit` and `destroy`. The player mounts one view per (region, type) pair and passes all of that pair's cues up front. This supports both:

- **persistent** elements (transcript, chapters) that render everything once and mark the active items, and
- **transient** elements (image, link) that exist only while active; `transientPlugin()` builds these from a render function.

The context gives plugins `seek`, `currentTime`, `prefersReducedMotion` and `resolveUrl` (relative to the cue document's URL), so plugins never reach into the player. Plugins build DOM with `textContent`, never `innerHTML`, so cue data cannot inject markup. See [decision 0004](decisions/0004-element-plugin-registry.md).

## Player and layout

The player renders a grid: the stage (media plus overlay regions) and an optional sidebar, then a below area. A container query stacks the sidebar under the stage when the player is narrower than 720 px, so the layout follows the space the player is given rather than the window. The sidebar is sized to the stage's height and scrolls internally.

Overlay regions ignore pointer events except on their content and keep clear of the native controls at the bottom.

## Accessibility

- Transcript lines and chapters are native buttons with spoken-time labels; the active one has `aria-current`.
- The transcript is not a live region, to avoid talking over the media. The current-chapter line is polite and live, because chapter changes are rare. Other regions are live only when the cue document sets `announce`.
- Auto-scroll moves the transcript container only (never the page), pauses while the user scrolls or has focus in the list, and jumps instead of animating when reduced motion is preferred. Entry animations are disabled under reduced motion.
- Links open in a new tab, with a visually hidden notice, so playback is not lost.

## Theming

Every colour and size is read from a public `--zz-*` custom property with a fallback. Custom properties inherit through shadow DOM, so pages theme the Web Component from outside. `theme="auto"` follows `prefers-color-scheme`.

## Web Component

`<zero-zero-player>` loads the cue document and optional WebVTT transcript, renders the player into an open shadow root and re-dispatches engine events as composed DOM events. A `<video>` or `<audio>` child is used in place of a created video via a slot, so pages keep control of their media element. Load errors render as an alert inside the component and fire `zz-error`. See [decision 0005](decisions/0005-web-component-and-shadow-dom.md).

## Testing

- Pure modules (index, scheduler, validator, WebVTT) are tested in Node.
- The engine is tested against a fake media object, including the video-frame loop.
- The player, plugins and Web Component are tested in jsdom.
- A real-browser test is on the roadmap.

# 5. A Web Component with an open shadow root

Date: 2026-10-21

## Status

Accepted

## Context

0-0 should drop into any site (static pages, CMSs, frameworks) without a build step, and its styles should neither leak into nor be broken by the host page.

## Decision

Ship `<zero-zero-player>` as a custom element (custom element names need a hyphen) that renders into an open shadow root. Theming uses `--zz-*` custom properties, which inherit into shadow DOM. A `<video>` or `<audio>` child is slotted in rather than replaced, so pages keep their own media element. The same rendering is available without the component through `createPlayer()`, which injects styles into the document head.

## Consequences

- Host page CSS cannot accidentally restyle the player; deliberate theming goes through custom properties.
- The open shadow root lets tests and tools inspect the player.
- Server-side rendering of the player is not supported yet.

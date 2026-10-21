# 4. Element types as plugins in a registry

Date: 2026-10-21

## Status

Accepted

## Context

The set of element types will grow (quotes, footnotes, maps, polls) and sites will want their own. Some types are persistent (a transcript shows every line all the time) and others transient (an image exists only while its cue is active).

## Decision

Each type is a plugin with a `type`, an optional payload validator, and `mount(container, cues, context)` returning a view with `enter`, `exit` and `destroy`. The player mounts one view per region and type, passing all relevant cues up front. A `transientPlugin()` helper covers the common case. Plugins are registered in an `ElementRegistry`; `createDefaultRegistry()` provides the built-ins.

Plugins receive a narrow context (`seek`, `currentTime`, `prefersReducedMotion`, `resolveUrl`) instead of the player itself.

## Consequences

- Built-in and third-party types use the same interface.
- Validation of custom types happens before render, with the same error reporting.
- Plugins must create DOM safely; the built-ins use text nodes only.

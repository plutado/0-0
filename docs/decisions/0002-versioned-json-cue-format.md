# 2. A versioned JSON cue format, with WebVTT as an interchange format

Date: 2026-10-21

## Status

Accepted

## Context

Cues need to carry structured data (image URLs and alt text, link titles and sources) and to be placed into named regions. WebVTT is the web's standard timed-text format and many tools produce it, but its cue payloads are text, it has no notion of layout regions outside the video, and metadata tracks have no agreed payload structure.

## Decision

The primary format is JSON with a top-level `version` (currently `1`), `metadata`, `regions` and `cues`. Each cue has `id`, `start`, `end`, `type`, `region` and a type-specific `data` object.

WebVTT is supported at the edges: captions and subtitles import as transcript cues, metadata tracks import when each payload is a JSON object with `type` and `data`, and transcripts export as captions.

The `version` changes only for incompatible changes.

## Consequences

- Documents are easy to generate and validate, and the validator can give precise paths.
- Existing captions work immediately as transcripts.
- Two formats must be kept in step; the WebVTT mapping is documented in `docs/cue-format.md`.

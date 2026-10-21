# 3. A static interval index for active-cue lookup

Date: 2026-10-21

## Status

Accepted

## Context

The engine must find the active cues many times a second, with documents that may contain thousands of cues (long transcripts) and arbitrary overlaps. A linear scan is simple but costs O(n) per frame. A cursor that advances with playback is fast but complicated by seeks, rate changes and overlapping cues of very different lengths.

## Decision

Use an immutable augmented index: cues sorted by start, viewed as an implicit balanced binary tree over the array, each node storing the maximum end time of its subtree. Point and range queries prune subtrees, giving O(log n + k). When cues change, rebuild the index.

Intervals are half-open, `[start, end)`, so back-to-back cues never overlap at the boundary.

## Consequences

- Seeks cost the same as normal playback; no cursor state to repair.
- Range queries let the scheduler report cues that were skipped between two updates.
- Editing tools that change cues continuously will rebuild often; incremental updates are on the roadmap if that becomes measurable.

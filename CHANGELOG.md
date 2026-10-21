# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project aims to follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-10-21

### Added

- Cue document format, version 1, with a validator that reports every issue with its path.
- WebVTT parser; import of captions/subtitles as transcript cues and of `metadata` tracks with JSON payloads as typed cues; transcript export to WebVTT.
- Interval index and a DOM-free cue scheduler.
- Cue engine bound to any media element, using `requestVideoFrameCallback` when available and `timeupdate` otherwise.
- Element plugin registry with transcript, image, link card and chapters elements.
- Sidebar, below and overlay regions with responsive stacking, light and dark themes, and reduced-motion support.
- `<zero-zero-player>` Web Component and `createPlayer()` programmatic API.
- Demo site with synthetic media, CI and GitHub Pages workflows.

[Unreleased]: https://github.com/plutado/0-0/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/plutado/0-0/releases/tag/v0.1.0

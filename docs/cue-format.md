# Cue document format (version 1)

A cue document is a JSON object describing what appears around a piece of media and when. It is independent of any one player: the validator runs in Node and the browser, and WebVTT can be converted to and from it.

```json
{
  "version": 1,
  "metadata": { "title": "A talk", "language": "en", "duration": 1800 },
  "regions": [
    { "id": "transcript", "placement": "sidebar", "label": "Transcript" },
    { "id": "notes", "placement": "below", "label": "Sources", "announce": true }
  ],
  "cues": [
    { "id": "t1", "start": 0, "end": 4.2, "type": "transcript", "region": "transcript",
      "data": { "text": "Welcome.", "speaker": "Host" } }
  ]
}
```

## Top level

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `version` | number | yes | Must be `1`. |
| `metadata` | object | no | Free-form, with the recognised fields below. |
| `regions` | array | yes | May be empty. |
| `cues` | array | yes | May be empty. Order does not matter. |

### Metadata

| Field | Type | Notes |
| --- | --- | --- |
| `title` | string | Used as the accessible name of a created video. |
| `description` | string | |
| `language` | string | BCP 47 tag; set as `lang` on the player. |
| `duration` | number | Seconds. Informational. |

Other keys are allowed and preserved.

## Regions

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | string | yes | Unique among regions. |
| `placement` | `"sidebar"`, `"below"` or `"overlay"` | yes | Sidebar regions sit beside the media and stack under it on narrow players. |
| `label` | string | no | Visible heading and accessible name. |
| `position` | `"top-left"`, `"top-right"`, `"bottom-left"`, `"bottom-right"`, `"center"` | no | Overlay anchor, default `"top-right"`. |
| `announce` | boolean | no | Announce new content politely to screen readers. Use for low-traffic regions only. |

## Cues

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | string | yes | Unique among cues. |
| `start` | number | yes | Seconds, inclusive, `>= 0`. |
| `end` | number | yes | Seconds, exclusive, `> start`. |
| `type` | string | yes | Element type. Unknown types pass validation (unless `strictTypes` is set) and are skipped by the player with a console warning. |
| `region` | string | yes | Must match a region id. |
| `data` | object | yes | Type-specific payload. |

A cue is active when `start <= currentTime < end`. Cues may overlap freely.

## Built-in types

### `transcript`

| Field | Type | Required |
| --- | --- | --- |
| `text` | string | yes, non-empty |
| `speaker` | string | no |

All transcript cues in a region render as a list; the active one is highlighted and each line seeks on click.

### `image`

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `src` | string | yes | http(s) or relative to the cue document. |
| `alt` | string | yes | Describe the image. `""` only for purely decorative images. |
| `caption` | string | no | |
| `credit` | string | no | |
| `width`, `height` | number | no | Positive; reserves space. |

### `link`

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `title` | string | yes | Link text. |
| `url` | string | yes | http(s) or relative. Other schemes are rejected. |
| `source` | string | no | Publication or site; defaults to the URL's host. |
| `summary` | string | no | |

### `chapter`

| Field | Type | Required |
| --- | --- | --- |
| `title` | string | yes |

All chapters in a region render as a navigation list with the current chapter marked.

## Validation

`validateCueDocument(value)` returns `{ ok: true, document }` or `{ ok: false, issues }`, where each issue has a `path` such as `cues[3].data.alt` and a `message`. It collects every issue rather than stopping at the first. `parseCueDocument(json)` and `assertCueDocument(value)` throw a `CueFormatError` listing the issues.

Custom element types can supply their own payload check through the plugin's `validate` function; the player validates with every registered plugin's checks.

## WebVTT

- **Captions and subtitles**: `vttToTranscriptCues(text, { region })` makes one transcript cue per VTT cue. The first `<v Name>` span becomes `speaker`; other markup is stripped and entities decoded.
- **Metadata tracks**: `vttToMetadataCues(text)` expects each cue payload to be a JSON object with `type`, `data` and optionally `region`:

  ```
  00:00:05.000 --> 00:00:12.000
  {"type": "link", "region": "notes", "data": {"title": "A source", "url": "https://example.com"}}
  ```

- **Export**: `transcriptCuesToVtt(cues)` writes transcript cues as a captions file with `<v>` spans for speakers.

## Versioning

The `version` field changes only for incompatible changes. Adding optional fields or new element types does not change it. See [decision 0002](decisions/0002-versioned-json-cue-format.md).

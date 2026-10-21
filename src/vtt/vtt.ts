import type { Cue, TranscriptData } from '../format/types';

/** One cue block from a WebVTT file. */
export interface VttCue {
  id?: string;
  start: number;
  end: number;
  /** Cue settings string, e.g. "align:start line:0". */
  settings: string;
  /** Raw payload, lines joined with "\n". */
  text: string;
}

export class VttParseError extends Error {
  readonly line: number;

  constructor(message: string, line: number) {
    super(`WebVTT line ${line}: ${message}`);
    this.name = 'VttParseError';
    this.line = line;
  }
}

const TIMESTAMP = /^(?:(\d{2,}):)?([0-5]\d):([0-5]\d)\.(\d{3})$/;

/** Parses a WebVTT timestamp ("01:02.345" or "01:02:03.456") into seconds. */
export function parseTimestamp(value: string): number | null {
  const m = TIMESTAMP.exec(value.trim());
  if (!m) return null;
  const [, h = '0', min, s, ms] = m;
  return Number(h) * 3600 + Number(min) * 60 + Number(s) + Number(ms) / 1000;
}

/** Formats seconds as a WebVTT timestamp, always with hours: "00:01:02.345". */
export function formatTimestamp(seconds: number): string {
  const totalMs = Math.max(0, Math.round(seconds * 1000));
  const ms = totalMs % 1000;
  const totalS = Math.floor(totalMs / 1000);
  const s = totalS % 60;
  const m = Math.floor(totalS / 60) % 60;
  const h = Math.floor(totalS / 3600);
  const pad = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}.${pad(ms, 3)}`;
}

/**
 * Parses WebVTT text into cue blocks. Skips NOTE, STYLE and REGION blocks.
 * Malformed cue timings throw a VttParseError with the line number.
 */
export function parseVtt(source: string): VttCue[] {
  const lines = source.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').split('\n');
  if (!/^WEBVTT(?:[ \t].*)?$/.test(lines[0] ?? '')) {
    throw new VttParseError('file must start with "WEBVTT"', 1);
  }

  const cues: VttCue[] = [];
  let i = 1;
  // Skip the rest of the header block.
  while (i < lines.length && lines[i]!.trim() !== '') i++;

  while (i < lines.length) {
    while (i < lines.length && lines[i]!.trim() === '') i++;
    if (i >= lines.length) break;

    const blockStart = i;
    const block: string[] = [];
    while (i < lines.length && lines[i]!.trim() !== '') block.push(lines[i++]!);

    const first = block[0]!;
    if (/^(NOTE|STYLE|REGION)(?:[ \t]|$)/.test(first)) continue;

    let timingIndex = first.includes('-->') ? 0 : 1;
    const id = timingIndex === 1 ? first.trim() : undefined;
    const timing = block[timingIndex];
    if (timing === undefined || !timing.includes('-->')) {
      throw new VttParseError('expected a cue timing line ("00:00.000 --> 00:01.000")', blockStart + 1 + timingIndex);
    }
    const match = /^\s*(\S+)\s+-->\s+(\S+)\s*(.*)$/.exec(timing);
    const start = match ? parseTimestamp(match[1]!) : null;
    const end = match ? parseTimestamp(match[2]!) : null;
    if (!match || start === null || end === null) {
      throw new VttParseError(`invalid cue timing "${timing.trim()}"`, blockStart + 1 + timingIndex);
    }
    timingIndex++;
    cues.push({
      ...(id ? { id } : {}),
      start,
      end,
      settings: match[3]!.trim(),
      text: block.slice(timingIndex).join('\n'),
    });
  }
  return cues;
}

const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&nbsp;': ' ',
  '&lrm;': '‎',
  '&rlm;': '‏',
  '&quot;': '"',
  '&apos;': "'",
};

/** Extracts plain text and the first voice (<v Name>) from a caption payload. */
export function stripCueMarkup(payload: string): { text: string; speaker?: string } {
  const voice = /<v(?:\.[^\s>]+)*\s+([^>]+)>/.exec(payload);
  const text = payload
    .replace(/<[^>]*>/g, '')
    .replace(/&[a-z]+;/g, (e) => ENTITIES[e] ?? e)
    .replace(/[ \t]*\n[ \t]*/g, ' ')
    .trim();
  const speaker = voice?.[1]?.trim();
  return speaker ? { text, speaker } : { text };
}

export interface ImportOptions {
  /** Region the cues render into. Defaults to "transcript" for captions. */
  region?: string;
  /** Prefix for generated cue ids. Defaults to "vtt-". */
  idPrefix?: string;
}

/**
 * Converts a captions or subtitles track into transcript cues. Voice spans
 * (<v Name>) become the speaker; other markup is removed.
 */
export function vttToTranscriptCues(source: string, options: ImportOptions = {}): Cue<TranscriptData>[] {
  const region = options.region ?? 'transcript';
  const prefix = options.idPrefix ?? 'vtt-';
  return parseVtt(source)
    .filter((c) => c.end > c.start)
    .map((c, index) => ({
      id: c.id ? `${prefix}${c.id}` : `${prefix}${index + 1}`,
      start: c.start,
      end: c.end,
      type: 'transcript',
      region,
      data: stripCueMarkup(c.text),
    }))
    .filter((c) => c.data.text !== '');
}

/**
 * Converts a `metadata` track whose cue payloads are JSON objects into typed
 * cues. Each payload must have "type" and "data", and may have "region"
 * (falling back to options.region). Payloads that are not valid JSON throw.
 *
 *   00:00:05.000 --> 00:00:12.000
 *   {"type": "link", "region": "notes", "data": {"title": "...", "url": "..."}}
 */
export function vttToMetadataCues(source: string, options: ImportOptions = {}): Cue[] {
  const prefix = options.idPrefix ?? 'vtt-';
  return parseVtt(source).map((c, index) => {
    const id = c.id ? `${prefix}${c.id}` : `${prefix}${index + 1}`;
    let payload: unknown;
    try {
      payload = JSON.parse(c.text);
    } catch {
      throw new Error(`Metadata cue "${id}" does not contain valid JSON`);
    }
    if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
      throw new Error(`Metadata cue "${id}" must contain a JSON object`);
    }
    const p = payload as Record<string, unknown>;
    const region = typeof p.region === 'string' ? p.region : options.region;
    if (typeof p.type !== 'string' || !region) {
      throw new Error(`Metadata cue "${id}" needs a "type" and a "region" (in the payload or the import options)`);
    }
    return { id, start: c.start, end: c.end, type: p.type, region, data: p.data ?? {} };
  });
}

function escapeCueText(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/-->/g, '--&gt;');
}

/** Serialises transcript cues as a WebVTT captions file, with <v> spans for speakers. */
export function transcriptCuesToVtt(cues: readonly Cue[]): string {
  const blocks = cues
    .filter((c): c is Cue<TranscriptData> => c.type === 'transcript')
    .slice()
    .sort((a, b) => a.start - b.start)
    .map((c) => {
      const text = escapeCueText(c.data.text);
      const speaker = c.data.speaker ? escapeCueText(c.data.speaker) : undefined;
      const payload = speaker ? `<v ${speaker}>${text}` : text;
      const id = c.id.replace(/-->|\n/g, ' ');
      return `${id}\n${formatTimestamp(c.start)} --> ${formatTimestamp(c.end)}\n${payload}`;
    });
  return `WEBVTT\n\n${blocks.join('\n\n')}\n`;
}

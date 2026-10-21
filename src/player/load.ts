import type { CueDocument, Region } from '../format/types';
import { parseCueDocument, type ValidateOptions } from '../format/validate';
import { vttToTranscriptCues } from '../vtt/vtt';

async function fetchText(url: string, what: string, init?: RequestInit): Promise<string> {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(`Could not load ${what} from ${url} (HTTP ${response.status})`);
  return response.text();
}

/** Fetches and validates a cue document. */
export async function loadCueDocument(url: string, options?: ValidateOptions & { init?: RequestInit }): Promise<CueDocument> {
  return parseCueDocument(await fetchText(url, 'cue document', options?.init), options);
}

export const DEFAULT_TRANSCRIPT_REGION: Region = {
  id: 'transcript',
  placement: 'sidebar',
  label: 'Transcript',
};

/**
 * Adds transcript cues from WebVTT captions to a document (or to a new empty
 * one), creating a sidebar "transcript" region when the document has none.
 */
export function withTranscript(vtt: string, document?: CueDocument, regionId = DEFAULT_TRANSCRIPT_REGION.id): CueDocument {
  const base: CueDocument = document ?? { version: 1, regions: [], cues: [] };
  const regions = base.regions.some((r) => r.id === regionId)
    ? base.regions
    : [...base.regions, { ...DEFAULT_TRANSCRIPT_REGION, id: regionId }];
  const existing = new Set(base.cues.map((c) => c.id));
  const imported = vttToTranscriptCues(vtt, { region: regionId, idPrefix: 'vtt-' }).map((c) =>
    existing.has(c.id) ? { ...c, id: `${c.id}-${Math.random().toString(36).slice(2, 7)}` } : c,
  );
  return { ...base, regions, cues: [...base.cues, ...imported] };
}

/** Fetches a WebVTT captions file and merges it into a document as transcript cues. */
export async function loadTranscript(url: string, document?: CueDocument, regionId?: string): Promise<CueDocument> {
  return withTranscript(await fetchText(url, 'transcript'), document, regionId);
}

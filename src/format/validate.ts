import {
  CUE_FORMAT_VERSION,
  type Cue,
  type CueDocument,
  type Region,
} from './types';

export interface ValidationIssue {
  /** JSON-path-like location, e.g. "cues[3].data.alt". */
  path: string;
  message: string;
}

/**
 * Checks the `data` payload of one cue type. Returns an empty array when the
 * payload is valid. Must not touch the DOM so documents can be validated in
 * Node, at build time or in an editor.
 */
export type DataValidator = (data: Record<string, unknown>, path: string) => ValidationIssue[];

export interface ValidateOptions {
  /** Per-type payload checks. Defaults to the built-in element types. */
  dataValidators?: Record<string, DataValidator>;
  /** Reject cue types that have no data validator. Defaults to false. */
  strictTypes?: boolean;
}

export type ValidationResult =
  | { ok: true; document: CueDocument; issues: [] }
  | { ok: false; issues: ValidationIssue[] };

export class CueFormatError extends Error {
  readonly issues: ValidationIssue[];

  constructor(issues: ValidationIssue[]) {
    const lines = issues.slice(0, 10).map((i) => `  ${i.path}: ${i.message}`);
    if (issues.length > 10) lines.push(`  ...and ${issues.length - 10} more`);
    super(`Invalid cue document (${issues.length} issue${issues.length === 1 ? '' : 's'}):\n${lines.join('\n')}`);
    this.name = 'CueFormatError';
    this.issues = issues;
  }
}

const PLACEMENTS = new Set(['sidebar', 'below', 'overlay']);
const POSITIONS = new Set(['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function describe(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'an array';
  return typeof value === 'string' ? `"${value}"` : typeof value;
}

/** True for http(s) URLs and relative references; false for javascript:, data: and other schemes. */
export function isSafeUrl(value: string): boolean {
  const trimmed = value.trim();
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(trimmed);
  if (!scheme) return trimmed.length > 0;
  const name = scheme[1]!.toLowerCase();
  return name === 'http' || name === 'https';
}

function requireString(
  data: Record<string, unknown>,
  key: string,
  path: string,
  issues: ValidationIssue[],
  { allowEmpty = false } = {},
): void {
  const value = data[key];
  if (typeof value !== 'string') {
    issues.push({ path: `${path}.${key}`, message: `must be a string, got ${describe(value)}` });
  } else if (!allowEmpty && value.trim() === '') {
    issues.push({ path: `${path}.${key}`, message: 'must not be empty' });
  }
}

function optionalString(data: Record<string, unknown>, key: string, path: string, issues: ValidationIssue[]): void {
  if (data[key] !== undefined && typeof data[key] !== 'string') {
    issues.push({ path: `${path}.${key}`, message: `must be a string when present, got ${describe(data[key])}` });
  }
}

/** Payload checks for the built-in element types. */
export const builtinDataValidators: Record<string, DataValidator> = {
  transcript(data, path) {
    const issues: ValidationIssue[] = [];
    requireString(data, 'text', path, issues);
    optionalString(data, 'speaker', path, issues);
    return issues;
  },
  image(data, path) {
    const issues: ValidationIssue[] = [];
    requireString(data, 'src', path, issues);
    if (typeof data.src === 'string' && data.src && !isSafeUrl(data.src)) {
      issues.push({ path: `${path}.src`, message: 'must be an http(s) or relative URL' });
    }
    if (typeof data.alt !== 'string') {
      issues.push({
        path: `${path}.alt`,
        message: 'is required: describe the image, or use "" only if it is purely decorative',
      });
    }
    optionalString(data, 'caption', path, issues);
    optionalString(data, 'credit', path, issues);
    for (const key of ['width', 'height']) {
      const v = data[key];
      if (v !== undefined && (typeof v !== 'number' || !(v > 0))) {
        issues.push({ path: `${path}.${key}`, message: 'must be a positive number when present' });
      }
    }
    return issues;
  },
  link(data, path) {
    const issues: ValidationIssue[] = [];
    requireString(data, 'title', path, issues);
    requireString(data, 'url', path, issues);
    if (typeof data.url === 'string' && data.url && !isSafeUrl(data.url)) {
      issues.push({ path: `${path}.url`, message: 'must be an http(s) or relative URL' });
    }
    optionalString(data, 'source', path, issues);
    optionalString(data, 'summary', path, issues);
    return issues;
  },
  chapter(data, path) {
    const issues: ValidationIssue[] = [];
    requireString(data, 'title', path, issues);
    return issues;
  },
};

function validateRegion(raw: unknown, path: string, issues: ValidationIssue[]): raw is Region {
  if (!isRecord(raw)) {
    issues.push({ path, message: `must be an object, got ${describe(raw)}` });
    return false;
  }
  const before = issues.length;
  if (typeof raw.id !== 'string' || raw.id === '') {
    issues.push({ path: `${path}.id`, message: 'must be a non-empty string' });
  }
  if (typeof raw.placement !== 'string' || !PLACEMENTS.has(raw.placement)) {
    issues.push({
      path: `${path}.placement`,
      message: `must be one of "sidebar", "below", "overlay", got ${describe(raw.placement)}`,
    });
  }
  if (raw.label !== undefined && typeof raw.label !== 'string') {
    issues.push({ path: `${path}.label`, message: 'must be a string when present' });
  }
  if (raw.position !== undefined && (typeof raw.position !== 'string' || !POSITIONS.has(raw.position))) {
    issues.push({
      path: `${path}.position`,
      message: `must be one of ${[...POSITIONS].map((p) => `"${p}"`).join(', ')}`,
    });
  }
  if (raw.announce !== undefined && typeof raw.announce !== 'boolean') {
    issues.push({ path: `${path}.announce`, message: 'must be a boolean when present' });
  }
  return issues.length === before;
}

function validateCue(
  raw: unknown,
  path: string,
  regionIds: Set<string>,
  options: Required<ValidateOptions>,
  issues: ValidationIssue[],
): raw is Cue {
  if (!isRecord(raw)) {
    issues.push({ path, message: `must be an object, got ${describe(raw)}` });
    return false;
  }
  const before = issues.length;
  if (typeof raw.id !== 'string' || raw.id === '') {
    issues.push({ path: `${path}.id`, message: 'must be a non-empty string' });
  }
  const startOk = typeof raw.start === 'number' && Number.isFinite(raw.start) && raw.start >= 0;
  if (!startOk) {
    issues.push({ path: `${path}.start`, message: `must be a finite number of seconds >= 0, got ${describe(raw.start)}` });
  }
  const endOk = typeof raw.end === 'number' && Number.isFinite(raw.end);
  if (!endOk) {
    issues.push({ path: `${path}.end`, message: `must be a finite number of seconds, got ${describe(raw.end)}` });
  }
  if (startOk && endOk && (raw.end as number) <= (raw.start as number)) {
    issues.push({ path: `${path}.end`, message: `must be greater than start (${raw.start as number}), got ${raw.end as number}` });
  }
  if (typeof raw.type !== 'string' || raw.type === '') {
    issues.push({ path: `${path}.type`, message: 'must be a non-empty string' });
  }
  if (typeof raw.region !== 'string' || raw.region === '') {
    issues.push({ path: `${path}.region`, message: 'must be a non-empty string' });
  } else if (!regionIds.has(raw.region)) {
    issues.push({ path: `${path}.region`, message: `refers to unknown region "${raw.region}"` });
  }
  if (!isRecord(raw.data)) {
    issues.push({ path: `${path}.data`, message: `must be an object, got ${describe(raw.data)}` });
  } else if (typeof raw.type === 'string') {
    const check = options.dataValidators[raw.type];
    if (check) {
      issues.push(...check(raw.data, `${path}.data`));
    } else if (options.strictTypes) {
      issues.push({ path: `${path}.type`, message: `unknown cue type "${raw.type}"` });
    }
  }
  return issues.length === before;
}

/**
 * Validates an unknown value (usually parsed JSON) against the cue format.
 * Collects every problem rather than stopping at the first one.
 */
export function validateCueDocument(input: unknown, options: ValidateOptions = {}): ValidationResult {
  const opts: Required<ValidateOptions> = {
    dataValidators: options.dataValidators ?? builtinDataValidators,
    strictTypes: options.strictTypes ?? false,
  };
  const issues: ValidationIssue[] = [];

  if (!isRecord(input)) {
    return { ok: false, issues: [{ path: '$', message: `must be an object, got ${describe(input)}` }] };
  }
  if (input.version !== CUE_FORMAT_VERSION) {
    issues.push({ path: 'version', message: `must be ${CUE_FORMAT_VERSION}, got ${describe(input.version)}` });
  }
  if (input.metadata !== undefined && !isRecord(input.metadata)) {
    issues.push({ path: 'metadata', message: 'must be an object when present' });
  }

  const regionIds = new Set<string>();
  if (!Array.isArray(input.regions)) {
    issues.push({ path: 'regions', message: `must be an array, got ${describe(input.regions)}` });
  } else {
    input.regions.forEach((region, i) => {
      const path = `regions[${i}]`;
      if (validateRegion(region, path, issues)) {
        if (regionIds.has(region.id)) {
          issues.push({ path: `${path}.id`, message: `duplicate region id "${region.id}"` });
        }
        regionIds.add(region.id);
      }
    });
  }

  if (!Array.isArray(input.cues)) {
    issues.push({ path: 'cues', message: `must be an array, got ${describe(input.cues)}` });
  } else {
    const cueIds = new Set<string>();
    input.cues.forEach((cue, i) => {
      const path = `cues[${i}]`;
      validateCue(cue, path, regionIds, opts, issues);
      if (isRecord(cue) && typeof cue.id === 'string' && cue.id !== '') {
        if (cueIds.has(cue.id)) issues.push({ path: `${path}.id`, message: `duplicate cue id "${cue.id}"` });
        cueIds.add(cue.id);
      }
    });
  }

  if (issues.length > 0) return { ok: false, issues };
  return { ok: true, document: input as unknown as CueDocument, issues: [] };
}

/** Parses and validates JSON text, throwing a CueFormatError with every issue on failure. */
export function parseCueDocument(json: string, options?: ValidateOptions): CueDocument {
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch (error) {
    throw new CueFormatError([{ path: '$', message: `is not valid JSON (${(error as Error).message})` }]);
  }
  return assertCueDocument(value, options);
}

/** Validates a value, returning it typed or throwing a CueFormatError. */
export function assertCueDocument(value: unknown, options?: ValidateOptions): CueDocument {
  const result = validateCueDocument(value, options);
  if (!result.ok) throw new CueFormatError(result.issues);
  return result.document;
}

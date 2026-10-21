import { describe, expect, it } from 'vitest';
import { CueFormatError, isSafeUrl, parseCueDocument, validateCueDocument } from '../src/format/validate';
import demo from '../demo/public/media/cues.json';

const valid = {
  version: 1,
  regions: [{ id: 'side', placement: 'sidebar' }],
  cues: [{ id: 'c1', start: 0, end: 1, type: 'transcript', region: 'side', data: { text: 'Hello' } }],
};

describe('validateCueDocument', () => {
  it('accepts a valid document', () => {
    expect(validateCueDocument(valid).ok).toBe(true);
  });

  it('accepts the demo document', () => {
    const result = validateCueDocument(demo);
    expect(result.issues).toEqual([]);
  });

  it('collects every issue with a path', () => {
    const result = validateCueDocument({
      version: 2,
      regions: [{ id: 'side', placement: 'left' }],
      cues: [
        { id: 'c1', start: 2, end: 1, type: 'image', region: 'nowhere', data: { src: 'a.png' } },
        { id: 'c1', start: -1, end: 1, type: 'link', region: 'side', data: { title: 'x', url: 'javascript:alert(1)' } },
      ],
    });
    expect(result.ok).toBe(false);
    const paths = result.issues.map((i) => i.path);
    expect(paths).toEqual(
      expect.arrayContaining([
        'version',
        'regions[0].placement',
        'cues[0].end',
        'cues[0].region',
        'cues[0].data.alt',
        'cues[1].id',
        'cues[1].start',
        'cues[1].data.url',
      ]),
    );
  });

  it('allows unknown types unless strict', () => {
    const doc = { ...valid, cues: [{ ...valid.cues[0], type: 'poll' }] };
    expect(validateCueDocument(doc).ok).toBe(true);
    expect(validateCueDocument(doc, { strictTypes: true }).ok).toBe(false);
  });

  it('parseCueDocument throws a readable error', () => {
    expect(() => parseCueDocument('{')).toThrow(CueFormatError);
    try {
      parseCueDocument(JSON.stringify({ version: 1, regions: [], cues: {} }));
    } catch (error) {
      expect((error as Error).message).toContain('cues: must be an array');
    }
  });

  it('isSafeUrl allows http(s) and relative URLs only', () => {
    expect(isSafeUrl('https://example.com')).toBe(true);
    expect(isSafeUrl('media/a.svg')).toBe(true);
    expect(isSafeUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeUrl('data:text/html,hi')).toBe(false);
  });
});

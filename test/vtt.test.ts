import { describe, expect, it } from 'vitest';
import {
  formatTimestamp,
  parseTimestamp,
  parseVtt,
  transcriptCuesToVtt,
  vttToMetadataCues,
  vttToTranscriptCues,
  VttParseError,
} from '../src/vtt/vtt';
import captions from '../demo/public/media/captions.vtt?raw';

describe('WebVTT', () => {
  it('parses and formats timestamps', () => {
    expect(parseTimestamp('01:02.345')).toBeCloseTo(62.345);
    expect(parseTimestamp('01:00:00.000')).toBe(3600);
    expect(parseTimestamp('1:2.3')).toBeNull();
    expect(formatTimestamp(3723.5)).toBe('01:02:03.500');
  });

  it('parses cues, skipping NOTE and STYLE blocks', () => {
    const cues = parseVtt(
      'WEBVTT - title\n\nNOTE hello\n\nSTYLE\n::cue { color: red }\n\nid1\n00:01.000 --> 00:02.000 align:start\nLine one\nline two\n\n00:03.000 --> 00:04.000\nThird\n',
    );
    expect(cues).toHaveLength(2);
    expect(cues[0]).toMatchObject({ id: 'id1', start: 1, end: 2, settings: 'align:start', text: 'Line one\nline two' });
    expect(cues[1]!.id).toBeUndefined();
  });

  it('rejects files without a header and bad timings', () => {
    expect(() => parseVtt('00:01.000 --> 00:02.000\nx')).toThrow(VttParseError);
    expect(() => parseVtt('WEBVTT\n\n00:01 --> 00:02.000\nx')).toThrow(/line 3/);
  });

  it('imports captions as transcript cues with speakers', () => {
    const cues = vttToTranscriptCues('WEBVTT\n\n00:00.000 --> 00:01.000\n<v.loud Host>Hi &amp; <b>welcome</b>\n');
    expect(cues[0]).toMatchObject({ type: 'transcript', region: 'transcript', data: { text: 'Hi & welcome', speaker: 'Host' } });
  });

  it('imports the demo captions', () => {
    const cues = vttToTranscriptCues(captions);
    expect(cues).toHaveLength(12);
  });

  it('imports metadata tracks with JSON payloads', () => {
    const cues = vttToMetadataCues(
      'WEBVTT\n\n00:05.000 --> 00:06.000\n{"type":"link","region":"notes","data":{"title":"T","url":"https://example.com"}}\n',
    );
    expect(cues[0]).toMatchObject({ start: 5, end: 6, type: 'link', region: 'notes', data: { title: 'T' } });
    expect(() => vttToMetadataCues('WEBVTT\n\n00:05.000 --> 00:06.000\nnot json\n')).toThrow(/valid JSON/);
  });

  it('round-trips transcript cues through export', () => {
    const original = vttToTranscriptCues('WEBVTT\n\na\n00:00:01.000 --> 00:00:02.500\n<v Host>One < two\n');
    const vtt = transcriptCuesToVtt(original);
    expect(vtt).toContain('<v Host>One &lt; two');
    const back = vttToTranscriptCues(vtt, { idPrefix: '' });
    expect(back[0]!.data).toEqual(original[0]!.data);
    expect(back[0]!.end).toBe(2.5);
  });
});

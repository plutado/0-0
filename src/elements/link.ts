import type { LinkData } from '../format/types';
import { builtinDataValidators, isSafeUrl } from '../format/validate';
import { h } from './dom';
import { transientPlugin } from './transient';

/**
 * A card for a source being referenced: title (linked), source name and an
 * optional summary. Links open in a new tab so playback is not interrupted.
 */
export const linkPlugin = transientPlugin<LinkData>(
  'link',
  (cue, ctx) => {
    const { title, url, source, summary } = cue.data;
    const href = isSafeUrl(url) ? ctx.resolveUrl(url) : undefined;
    const anchor = h(
      ctx.document,
      'a',
      { href, target: '_blank', rel: 'noopener noreferrer' },
      title,
      h(ctx.document, 'span', { class: 'zz-visually-hidden' }, ' (opens in a new tab)'),
    );
    let host: string;
    try {
      host = href ? new URL(href).hostname : '';
    } catch {
      host = '';
    }
    return h(
      ctx.document,
      'article',
      { class: 'zz-link' },
      h(ctx.document, 'p', { class: 'zz-link__source' }, source ?? host),
      h(ctx.document, 'h3', { class: 'zz-link__title' }, anchor),
      summary ? h(ctx.document, 'p', { class: 'zz-link__summary' }, summary) : null,
    );
  },
  builtinDataValidators.link,
);

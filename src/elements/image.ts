import type { ImageData } from '../format/types';
import { builtinDataValidators } from '../format/validate';
import { h } from './dom';
import { transientPlugin } from './transient';

/** An image shown while its cue is active. Alt text is required by the validator. */
export const imagePlugin = transientPlugin<ImageData>(
  'image',
  (cue, ctx) => {
    const { src, alt, caption, credit, width, height } = cue.data;
    const img = h(ctx.document, 'img', {
      src: ctx.resolveUrl(src),
      alt,
      width,
      height,
      loading: 'lazy',
      decoding: 'async',
    });
    const figcaption =
      caption || credit
        ? h(
            ctx.document,
            'figcaption',
            {},
            caption ?? '',
            credit ? h(ctx.document, 'span', { class: 'zz-credit' }, credit) : null,
          )
        : null;
    return h(ctx.document, 'figure', { class: 'zz-image' }, img, figcaption);
  },
  builtinDataValidators.image,
);

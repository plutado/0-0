import type { Cue } from '../format/types';
import type { DataValidator } from '../format/validate';
import type { ElementContext, ElementPlugin, ElementView } from './types';

/**
 * Builds a plugin for elements that exist only while their cue is active
 * (images, cards, quotes). Active items are kept in start-time order.
 */
export function transientPlugin<TData>(
  type: string,
  render: (cue: Cue<TData>, context: ElementContext) => HTMLElement,
  validate?: DataValidator,
): ElementPlugin<TData> {
  return {
    type,
    ...(validate ? { validate } : {}),
    mount(container, _cues, context): ElementView<TData> {
      const list = context.document.createElement('div');
      list.className = `zz-stack zz-stack--${type}`;
      container.append(list);
      const mounted = new Map<string, { cue: Cue<TData>; el: HTMLElement }>();

      return {
        enter(cue) {
          if (mounted.has(cue.id)) return;
          const el = render(cue, context);
          el.classList.add('zz-item');
          el.dataset.cueId = cue.id;
          const after = [...mounted.values()]
            .filter((m) => m.cue.start > cue.start)
            .sort((a, b) => a.cue.start - b.cue.start)[0];
          list.insertBefore(el, after ? after.el : null);
          mounted.set(cue.id, { cue, el });
        },
        exit(cue) {
          const m = mounted.get(cue.id);
          if (!m) return;
          m.el.remove();
          mounted.delete(cue.id);
        },
        destroy() {
          mounted.clear();
          list.remove();
        },
      };
    },
  };
}

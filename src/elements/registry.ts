import type { DataValidator } from '../format/validate';
import { chaptersPlugin } from './chapters';
import { imagePlugin } from './image';
import { linkPlugin } from './link';
import { transcriptPlugin } from './transcript';
import type { ElementPlugin } from './types';

/** Maps cue types to element plugins. */
export class ElementRegistry {
  private readonly plugins = new Map<string, ElementPlugin<never>>();

  constructor(plugins: Iterable<ElementPlugin<never>> = []) {
    for (const plugin of plugins) this.register(plugin);
  }

  /** Adds or replaces the plugin for plugin.type. */
  register<T>(plugin: ElementPlugin<T>): this {
    if (!plugin.type) throw new Error('Element plugins need a non-empty type');
    this.plugins.set(plugin.type, plugin as unknown as ElementPlugin<never>);
    return this;
  }

  get(type: string): ElementPlugin<unknown> | undefined {
    return this.plugins.get(type) as ElementPlugin<unknown> | undefined;
  }

  has(type: string): boolean {
    return this.plugins.has(type);
  }

  types(): string[] {
    return [...this.plugins.keys()];
  }

  /** Validators for every registered plugin that has one, for validateCueDocument. */
  dataValidators(): Record<string, DataValidator> {
    const out: Record<string, DataValidator> = {};
    for (const [type, plugin] of this.plugins) if (plugin.validate) out[type] = plugin.validate;
    return out;
  }
}

export const builtinPlugins = [transcriptPlugin, imagePlugin, linkPlugin, chaptersPlugin] as const;

/** A new registry containing the built-in element types. */
export function createDefaultRegistry(): ElementRegistry {
  const registry = new ElementRegistry();
  for (const plugin of builtinPlugins) registry.register(plugin as ElementPlugin<unknown>);
  return registry;
}

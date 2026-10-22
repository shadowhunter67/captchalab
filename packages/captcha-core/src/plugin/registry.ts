import { PLUGIN_BRAND, type AnyCaptchaPlugin } from "./types";

/** Plugins keyed by their own id. */
export type PluginMap = { readonly [id: string]: AnyCaptchaPlugin };

/** Compile-time check that every key equals its plugin's `id`. */
type IdsMatchKeys<M extends PluginMap> = { readonly [K in keyof M]: { readonly id: K } };

export type PluginId<M extends PluginMap> = keyof M & string;

/**
 * Compile-time registry. The map type is the source of truth, so
 * `registry.get("slider")` is exactly the slider plugin: Challenge / Answer / Features /
 * FeatureContext all preserved, no casts in consumer code.
 */
export interface PluginRegistry<M extends PluginMap> {
  readonly ids: readonly PluginId<M>[];
  /** Typed lookup. Unknown ids are a compile error (and throw for untyped JS callers). */
  get<K extends PluginId<M>>(id: K): M[K];
  /** Lookup for untrusted strings (URL params). Returns the union of plugins, narrow by `.id`. */
  find(id: string): M[PluginId<M>] | undefined;
  has(id: string): id is PluginId<M>;
  list(): readonly M[PluginId<M>][];
}

/**
 * Adding a CAPTCHA = add it to the object passed here (and thus to the inferred map).
 * Dynamic third-party plugin loading is intentionally out of scope for the MVP (ADR 0002).
 */
export function createPluginRegistry<const M extends PluginMap>(
  plugins: M & IdsMatchKeys<M>,
): PluginRegistry<M> {
  const entries = Object.entries(plugins) as [PluginId<M>, M[PluginId<M>]][];
  for (const [key, plugin] of entries) {
    const p = plugin as Partial<AnyCaptchaPlugin> | null | undefined;
    if (!p || p[PLUGIN_BRAND] !== true) {
      throw new Error(`CAPTCHA plugin "${key}" must be created with defineCaptchaPlugin`);
    }
    if (plugin.id !== key) {
      throw new Error(`CAPTCHA plugin registered under "${key}" but its id is "${plugin.id}"`);
    }
  }
  const byId = new Map<string, M[PluginId<M>]>(entries);
  const has = (id: string): id is PluginId<M> => byId.has(id);
  return {
    ids: entries.map(([k]) => k),
    get<K extends PluginId<M>>(id: K): M[K] {
      const plugin = byId.get(id);
      if (!plugin) throw new Error(`Unknown CAPTCHA plugin: ${id}`);
      return plugin as M[K];
    },
    find: (id) => byId.get(id),
    has,
    list: () => entries.map(([, p]) => p),
  };
}

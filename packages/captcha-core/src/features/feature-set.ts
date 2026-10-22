/**
 * Versioned feature output. Version lives on the envelope, never on individual numbers.
 *
 * - schemaVersion: the shape and *meaning* of the features (what each number measures, its unit,
 *   edge-case rules). Changing a definition MUST change this. Comparable only when equal.
 * - extractorVersion: the implementation/algorithm. Changes for fixes or refinements that keep
 *   the meaning (e.g. a numerical bug fix). Lets stored data be traced to the code that made it.
 *
 * Both are composite strings ("slider@1;motion@1") because plugin features embed core motion
 * features; a change in either layer must be visible. Golden tests pin the current values.
 */
export interface FeatureSet<TFeatures> {
  readonly schemaVersion: string;
  readonly extractorVersion: string;
  readonly features: TFeatures;
}

export function composeVersion(...parts: readonly string[]): string {
  return parts.join(";");
}

export function createFeatureSet<TFeatures>(
  schemaVersion: string,
  extractorVersion: string,
  features: TFeatures,
): FeatureSet<TFeatures> {
  return { schemaVersion, extractorVersion, features };
}

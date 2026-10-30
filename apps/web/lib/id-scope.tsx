"use client";

import { createContext, useContext, type ReactNode } from "react";

const Prefix = createContext("");

/**
 * Pages that mount two sessions side by side (Hybrid) wrap each one in a scope, so the fixed ids of a session and its
 * Inspect block (try-h, inspect-h, ...) stay unique and every aria-labelledby points at its own heading. Outside a scope
 * the prefix is empty and ids are exactly what they always were.
 */
export function IdScope({ prefix, children }: { prefix: string; children: ReactNode }) {
  return <Prefix.Provider value={prefix}>{children}</Prefix.Provider>;
}

export function useScopedId(): (base: string) => string {
  const prefix = useContext(Prefix);
  return (base) => `${prefix}${base}`;
}

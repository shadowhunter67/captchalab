"use client";

import { useEffect, useSyncExternalStore } from "react";
import { appendRecord, removeRecord, setLabel, setNote, type DatasetRecord, type GroundTruthLabel } from "./records";

/**
 * The in-memory dataset: ONE module-level value shared by the pages of this tab, so "Add to dataset" on Compare or
 * Experiments is still there on the dataset page. It lives only in this tab's JavaScript memory: nothing is written
 * to storage, nothing is sent, and a reload (or a new tab) starts empty. `dirty` means "changed since the last export".
 */
interface DatasetState {
  records: readonly DatasetRecord[];
  dirty: boolean;
}

const EMPTY: DatasetState = { records: [], dirty: false };
let state: DatasetState = EMPTY;
const listeners = new Set<() => void>();

const publish = (next: DatasetState): void => {
  state = next;
  for (const l of listeners) l();
};

export const datasetStore = {
  get: (): DatasetState => state,
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  /** Adds a draft record and returns its local id. Throws FormatError when the dataset is full. */
  add(draft: Omit<DatasetRecord, "id">): string {
    const records = appendRecord(state.records, draft);
    publish({ records, dirty: true });
    return (records[records.length - 1] as DatasetRecord).id;
  },
  setLabel(id: string, label: GroundTruthLabel): void {
    publish({ records: setLabel(state.records, id, label), dirty: true });
  },
  setNote(id: string, note: string): void {
    publish({ records: setNote(state.records, id, note), dirty: true });
  },
  remove(id: string): void {
    publish({ records: removeRecord(state.records, id), dirty: true });
  },
  /** Replaces everything (used by import, which already merged with the current records). */
  replaceAll(records: readonly DatasetRecord[], dirty: boolean): void {
    publish({ records, dirty });
  },
  markExported(): void {
    publish({ records: state.records, dirty: false });
  },
  clear(): void {
    publish(EMPTY);
  },
};

export function useDataset(): DatasetState {
  return useSyncExternalStore(datasetStore.subscribe, datasetStore.get, () => EMPTY);
}

/** Asks the browser to confirm before the page is left or reloaded while the dataset has unexported changes. */
export function useDatasetUnloadGuard(): void {
  const { records, dirty } = useDataset();
  useEffect(() => {
    if (!dirty || records.length === 0) return;
    const h = (e: BeforeUnloadEvent): void => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty, records.length]);
}

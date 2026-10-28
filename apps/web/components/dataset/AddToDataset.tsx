"use client";

import Link from "next/link";
import { useState } from "react";
import { datasetStore, useDataset, useDatasetUnloadGuard } from "@/lib/dataset/store";
import type { DatasetRecord } from "@/lib/dataset/records";
import { describeError } from "@/lib/research/browser";
import { useT } from "@/lib/i18n";

interface Props {
  /** Builds the record to add, or null when there is nothing valid to add yet. Called on click only. */
  build: () => Omit<DatasetRecord, "id"> | null;
  label: string;
  /** What the label of the new record will be, shown as a hint. */
  hint?: string;
  disabled?: boolean;
  testId: string;
}

/**
 * An explicit "Add to dataset" action. Nothing is ever added automatically. The dataset lives in this tab's memory
 * only, which the message says each time.
 */
export function AddToDataset({ build, label, hint, disabled = false, testId }: Props) {
  const t = useT();
  const { records } = useDataset();
  useDatasetUnloadGuard();
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const add = (): void => {
    try {
      const draft = build();
      if (!draft) {
        setMessage({ kind: "error", text: t("Chưa có phiên hợp lệ để thêm.", "There is no valid session to add yet.") });
        return;
      }
      const id = datasetStore.add(draft);
      setMessage({ kind: "ok", text: t(`Đã thêm vào bộ dữ liệu (${id}).`, `Added to the dataset (${id}).`) });
    } catch (err) {
      setMessage({ kind: "error", text: describeError(err, t) });
    }
  };

  return (
    <div className="space-y-1" data-testid={`${testId}-box`}>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" data-testid={testId} disabled={disabled} onClick={add} className="rounded-md border border-line bg-panel px-3 py-2 text-sm font-medium hover:bg-track disabled:opacity-50">
          {label}
        </button>
        {hint && <span className="text-xs text-muted">{hint}</span>}
        <Link prefetch={false} href="/experiments/dataset" className="text-sm underline" data-testid={`${testId}-open`}>
          {t(`Mở bộ dữ liệu (${records.length})`, `Open the dataset (${records.length})`)}
        </Link>
      </div>
      {message && (
        <p role={message.kind === "error" ? "alert" : "status"} data-testid={`${testId}-message`} className={`text-sm ${message.kind === "error" ? "text-bad" : "text-muted"}`}>
          {message.text}
        </p>
      )}
      <p className="text-xs text-muted">
        {t("Bộ dữ liệu chỉ nằm trong bộ nhớ của thẻ này cho đến khi bạn xuất nó ra tệp.", "The dataset exists only in this browser tab until you export it.")}
      </p>
    </div>
  );
}

import type { ReactNode } from "react";

/**
 * The status line of a system check (proof of work, proof of space, browser capability): a spinner while it works, a check
 * mark when it is verified, nothing otherwise. The words stay the source of truth (the spinner is decorative), and reduced
 * motion stops the spin through the global rule.
 */
export function StatusBadge({ state, children }: { state: "idle" | "working" | "done" | "stopped"; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span aria-hidden="true" className="grid h-5 w-5 place-items-center">
        {state === "working" ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-accent" />
        ) : state === "done" ? (
          <span className="grid h-5 w-5 place-items-center rounded-full bg-ok text-xs font-bold text-bg">✓</span>
        ) : (
          <span className="h-3 w-3 rounded-full border-2 border-line" />
        )}
      </span>
      <span>{children}</span>
    </span>
  );
}

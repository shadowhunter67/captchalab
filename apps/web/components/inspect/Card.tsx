import type { ReactNode } from "react";

/** Shared panel chrome for Inspect blocks (a labelled region with consistent spacing). */
export function Card({
  id,
  title,
  children,
  className = "",
}: {
  id: string;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section aria-labelledby={id} className={`min-w-0 rounded-lg border border-line bg-panel p-4 ${className}`}>
      <h3 id={id} className="mb-3 text-base font-semibold">
        {title}
      </h3>
      {children}
    </section>
  );
}

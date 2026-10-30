import type { ReactNode } from "react";
import { useScopedId } from "@/lib/id-scope";

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
  const sid = useScopedId();
  return (
    <section aria-labelledby={sid(id)} className={`min-w-0 rounded-lg border border-line bg-panel p-4 ${className}`}>
      <h3 id={sid(id)} className="mb-3 text-base font-semibold">
        {title}
      </h3>
      {children}
    </section>
  );
}

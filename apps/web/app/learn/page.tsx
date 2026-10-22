import type { Metadata } from "next";
import Link from "next/link";
import { CATALOG } from "@/lib/catalog";

export const metadata: Metadata = { title: "Learn · CaptchaLab" };

function List({ items }: { items: readonly string[] }) {
  return (
    <ul className="list-disc space-y-1 pl-5 text-muted">
      {items.map((i) => (
        <li key={i}>{i}</li>
      ))}
    </ul>
  );
}

export default function LearnIndexPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-6">
      <header>
        <Link href="/" className="text-sm text-muted underline">
          CaptchaLab
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Learn</h1>
        <p className="mt-1 text-sm text-muted" data-testid="learn-disclaimer">
          CaptchaLab illustrates signals that a CAPTCHA system may use. It does not claim to reproduce the complete internal
          mechanisms of commercial CAPTCHA systems. Measurements describe one interaction; they are not evidence that it was made
          by a person or by software, and the demo verifiers are not production security.
        </p>
        <nav aria-label="CAPTCHAs" className="mt-3 flex flex-wrap gap-3 text-sm">
          {CATALOG.map((c) => (
            <a key={c.id} href={`#${c.id}`} className="underline">
              {c.name}
            </a>
          ))}
        </nav>
      </header>
      {CATALOG.map((c) => (
        <section key={c.id} id={c.id} aria-labelledby={`${c.id}-h`} className="scroll-mt-4 space-y-3 rounded-lg border border-line bg-panel p-4 text-sm" data-testid={`learn-${c.id}`}>
          <h2 id={`${c.id}-h`} className="text-lg font-semibold">
            {c.name}
          </h2>
          <h3 className="font-semibold">How it works</h3>
          <p className="text-muted">{c.learn.howItWorks}</p>
          <h3 className="font-semibold">Generation</h3>
          <p className="text-muted">{c.learn.generation}</p>
          <h3 className="font-semibold">Verification</h3>
          <p className="text-muted">{c.learn.verification}</p>
          <h3 className="font-semibold">Behavioral signals</h3>
          <List items={c.learn.signals} />
          <h3 className="font-semibold">Strengths</h3>
          <List items={c.learn.strengths} />
          <h3 className="font-semibold">Weaknesses</h3>
          <List items={c.learn.weaknesses} />
          <h3 className="font-semibold">Accessibility</h3>
          <p className="text-muted">{c.learn.accessibility}</p>
          <h3 className="font-semibold">Automation considerations</h3>
          <p className="text-muted">{c.learn.automation}</p>
          <p>
            <Link href={c.route} className="underline">
              Open the {c.name} playground
            </Link>
          </p>
        </section>
      ))}
    </main>
  );
}

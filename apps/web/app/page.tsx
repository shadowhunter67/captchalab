import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-6 px-4 py-16 sm:px-6">
      <p className="font-mono text-sm text-muted">research / developer tool</p>
      <h1 className="text-4xl font-semibold tracking-tight">CaptchaLab</h1>
      <p className="text-xl text-muted">Explore. Interact. Understand.</p>
      <p className="max-w-prose text-muted">
        A controlled lab for looking at how people interact with CAPTCHA challenges: the events,
        the measured features and a replay of your own attempt. Everything runs in your browser;
        raw interaction data is not uploaded.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link
          href="/playground/slider"
          className="inline-block rounded-md bg-accent px-4 py-2.5 font-medium text-bg hover:opacity-90"
        >
          Open Slider Playground
        </Link>
        <Link
          href="/playground/checkbox"
          className="inline-block rounded-md border border-line bg-panel px-4 py-2.5 font-medium hover:bg-track"
        >
          Open Checkbox Playground
        </Link>
        <Link
          href="/playground/drag-drop"
          className="inline-block rounded-md border border-line bg-panel px-4 py-2.5 font-medium hover:bg-track"
        >
          Open Drag &amp; Drop Playground
        </Link>
        <Link
          href="/playground/rotation"
          className="inline-block rounded-md border border-line bg-panel px-4 py-2.5 font-medium hover:bg-track"
        >
          Open Rotation Playground
        </Link>
        <Link
          href="/playground/text"
          className="inline-block rounded-md border border-line bg-panel px-4 py-2.5 font-medium hover:bg-track"
        >
          Open Text Playground
        </Link>
        <Link
          href="/playground"
          className="inline-block rounded-md border border-line bg-panel px-4 py-2.5 font-medium hover:bg-track"
        >
          All playgrounds
        </Link>
        <Link
          href="/learn"
          className="inline-block rounded-md border border-line bg-panel px-4 py-2.5 font-medium hover:bg-track"
        >
          Learn
        </Link>
        <Link
          href="/playground/image-grid"
          className="inline-block rounded-md border border-line bg-panel px-4 py-2.5 font-medium hover:bg-track"
        >
          Open Image Grid Playground
        </Link>
      </div>
    </main>
  );
}

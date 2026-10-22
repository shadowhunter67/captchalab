/** Short educational content for the Text CAPTCHA. */
export function TextLearn() {
  return (
    <section aria-labelledby="learn-h" className="space-y-3 rounded-lg border border-line bg-panel p-4 text-sm" data-testid="learn">
      <h2 id="learn-h" className="text-base font-semibold">
        Learn: the text CAPTCHA
      </h2>
      <p className="text-muted">
        CaptchaLab illustrates signals that a CAPTCHA system may use. It does not claim to reproduce the complete
        internal mechanisms of commercial CAPTCHA systems.
      </p>
      <h3 className="font-semibold">How it works</h3>
      <p className="text-muted">You read a short distorted string and type it. The challenge compares what you typed with the string.</p>
      <h3 className="font-semibold">Generation</h3>
      <p className="text-muted">
        A seeded generator picks six characters from an alphabet without look-alikes (no 0/O, 1/I/l), then gives each
        one a small rotation and vertical shift and adds a few noise lines. The same seed gives the same image.
      </p>
      <h3 className="font-semibold">Verification</h3>
      <p className="text-muted">
        Correctness only: the typed text, trimmed and compared case-insensitively, must equal the string. How you typed
        never affects pass or fail.
      </p>
      <h3 className="font-semibold">Signals that may be observed</h3>
      <ul className="list-disc space-y-1 pl-5 text-muted">
        <li>Reaction time and time to the first character; total time.</li>
        <li>Rhythm: the time between characters.</li>
        <li>Corrections: Backspace and Delete after typing.</li>
        <li>Pauses and repeated attempts, and input modality.</li>
      </ul>
      <p className="text-muted">
        Privacy: the recording stores key classes (Letter, Digit, Backspace…), never which letter or digit was pressed,
        and the typed text is read once to verify and not kept. These are descriptions of one interaction, not rules for
        telling people from software.
      </p>
      <h3 className="font-semibold">Strengths</h3>
      <ul className="list-disc space-y-1 pl-5 text-muted">
        <li>Familiar and cheap; works with any keyboard.</li>
      </ul>
      <h3 className="font-semibold">Weaknesses</h3>
      <ul className="list-disc space-y-1 pl-5 text-muted">
        <li>Modern optical character recognition and vision models read simple distorted text well.</li>
        <li>Hard to read for many people, and nothing here is readable without sight.</li>
      </ul>
      <h3 className="font-semibold">Accessibility</h3>
      <p className="text-muted">
        The field is labelled and keyboard-operable, but the task needs vision and this demo offers no audio or text
        alternative. Do not treat it as accessible.
      </p>
      <h3 className="font-semibold">Automation considerations</h3>
      <p className="text-muted">
        In this demo the characters are plain SVG text, so they are trivial for software to read; real systems render
        pixels. CaptchaLab studies only its own lab challenge and does not integrate with or automate any third-party
        service.
      </p>
    </section>
  );
}

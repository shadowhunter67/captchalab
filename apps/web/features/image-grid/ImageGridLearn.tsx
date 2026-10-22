/** Short educational content for the Image Grid CAPTCHA. */
export function ImageGridLearn() {
  return (
    <section aria-labelledby="learn-h" className="space-y-3 rounded-lg border border-line bg-panel p-4 text-sm" data-testid="learn">
      <h2 id="learn-h" className="text-base font-semibold">
        Learn: the image grid CAPTCHA
      </h2>
      <p className="text-muted">
        CaptchaLab illustrates signals that a CAPTCHA system may use. It does not claim to reproduce the complete
        internal mechanisms of commercial CAPTCHA systems.
      </p>
      <h3 className="font-semibold">How it works</h3>
      <p className="text-muted">You see nine images and select every one that matches a named category, then verify.</p>
      <h3 className="font-semibold">Generation</h3>
      <p className="text-muted">
        A seeded generator picks a target shape, places it in two to four of the nine cells and fills the rest with other
        shapes. The images are simple SVG drawings, with no dataset or AI model. The same seed gives the same grid.
      </p>
      <h3 className="font-semibold">Verification</h3>
      <p className="text-muted">
        Correctness only: the selected cells must be exactly the cells showing the target, with none missing and none
        extra. How you selected never affects pass or fail.
      </p>
      <h3 className="font-semibold">Signals that may be observed</h3>
      <ul className="list-disc space-y-1 pl-5 text-muted">
        <li>Reaction time, time to the first selection, and total time.</li>
        <li>Rhythm: the time between toggles.</li>
        <li>Deselections: changing your mind.</li>
        <li>Rounds of selecting, and input modality (pointer or keyboard).</li>
      </ul>
      <p className="text-muted">These are descriptions of one interaction, not rules for telling people from software.</p>
      <h3 className="font-semibold">Strengths</h3>
      <ul className="list-disc space-y-1 pl-5 text-muted">
        <li>Quick for people, and the verifier is a simple set comparison.</li>
      </ul>
      <h3 className="font-semibold">Weaknesses</h3>
      <ul className="list-disc space-y-1 pl-5 text-muted">
        <li>Image classification by software is strong, so photo-based grids lose value over time.</li>
        <li>Ambiguous images frustrate people.</li>
      </ul>
      <h3 className="font-semibold">Accessibility</h3>
      <p className="text-muted">
        Here each tile is a labelled toggle button with arrow-key navigation, and its label names its shape. Real image
        grids need an equivalent non-visual alternative.
      </p>
      <h3 className="font-semibold">Automation considerations</h3>
      <p className="text-muted">
        Because labels name the shape, this demo is trivial for software. CaptchaLab studies only its own lab challenge
        and does not integrate with or automate any third-party service.
      </p>
    </section>
  );
}

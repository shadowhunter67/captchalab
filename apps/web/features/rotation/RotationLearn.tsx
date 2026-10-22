/** Short educational content for the Image Rotation CAPTCHA. */
export function RotationLearn() {
  return (
    <section aria-labelledby="learn-h" className="space-y-3 rounded-lg border border-line bg-panel p-4 text-sm" data-testid="learn">
      <h2 id="learn-h" className="text-base font-semibold">
        Learn: the image rotation CAPTCHA
      </h2>
      <p className="text-muted">
        CaptchaLab illustrates signals that a CAPTCHA system may use. It does not claim to reproduce the complete
        internal mechanisms of commercial CAPTCHA systems.
      </p>
      <h3 className="font-semibold">How it works</h3>
      <p className="text-muted">
        An object is shown turned by some angle. You turn it back until it looks upright, by dragging around its centre
        or with the arrow keys. The challenge checks the final angle only: is the shortest angular distance to upright
        within the tolerance? 359° and 1° are both 1° from upright.
      </p>
      <h3 className="font-semibold">Generation</h3>
      <p className="text-muted">
        A seeded generator picks a start angle between 40° and 320° (never already upright). The object is a simple
        drawn arrow, with no image assets.
      </p>
      <h3 className="font-semibold">Verification</h3>
      <p className="text-muted">Correctness only. How you turned it never affects pass or fail.</p>
      <h3 className="font-semibold">Signals that may be observed</h3>
      <ul className="list-disc space-y-1 pl-5 text-muted">
        <li>Reaction time, and how long the rotation took.</li>
        <li>Total turning and angular velocity (pointer drags).</li>
        <li>Corrections: reversals of turning direction, such as overshoot and return.</li>
        <li>Final angular error, number of attempts, and input modality.</li>
      </ul>
      <p className="text-muted">These describe one interaction; they are not rules for telling people from software.</p>
      <h3 className="font-semibold">Strengths</h3>
      <ul className="list-disc space-y-1 pl-5 text-muted">
        <li>Intuitive, and it needs a judgement about orientation, not just a click.</li>
        <li>Works with a pointer, touch or keyboard.</li>
      </ul>
      <h3 className="font-semibold">Weaknesses</h3>
      <ul className="list-disc space-y-1 pl-5 text-muted">
        <li>Simple orientation tasks can be solved by computer vision.</li>
        <li>Depends on seeing the object; a non-visual alternative is needed.</li>
      </ul>
      <h3 className="font-semibold">Accessibility</h3>
      <p className="text-muted">
        The object is a slider: focusable, with its angle as text, turned by the left and right arrow keys. Because the
        task is to recognise orientation visually, it is not accessible to everyone.
      </p>
      <h3 className="font-semibold">Automation considerations</h3>
      <p className="text-muted">
        A single known shape is easy to automate. CaptchaLab studies only its own lab challenge and does not integrate
        with or automate any third-party service.
      </p>
    </section>
  );
}

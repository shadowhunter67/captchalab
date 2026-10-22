/** Educational content for the Checkbox CAPTCHA (static; no data leaves the page). */
export function CheckboxLearn() {
  return (
    <section aria-labelledby="learn-h" className="space-y-3 rounded-lg border border-line bg-panel p-4 text-sm" data-testid="learn">
      <h2 id="learn-h" className="text-base font-semibold">
        Learn: the checkbox CAPTCHA
      </h2>
      <p className="text-muted">
        A checkbox-style CAPTCHA may be only one visible part of a larger risk or challenge system. CaptchaLab
        demonstrates interaction signals that such a system could observe, but does not claim to reproduce the
        internal mechanisms of commercial CAPTCHA services.
      </p>

      <h3 className="font-semibold">How it works</h3>
      <p className="text-muted">
        You activate the checkbox with a pointer or the keyboard. The challenge is verified from the final
        answer alone: is the box checked? This demo also records the timing of your input locally in the browser
        and shows it in Inspect. Nothing is uploaded.
      </p>

      <h3 className="font-semibold">Signals that may be observed</h3>
      <ul className="list-disc space-y-1 pl-5 text-muted">
        <li>Time to the first press and to the first completed activation.</li>
        <li>How long the control was held (press duration).</li>
        <li>Repeated activation (toggling), and the time between activations.</li>
        <li>Input modality: mouse, touch, pen or keyboard.</li>
        <li>The order and timing of the underlying press, release and key events.</li>
      </ul>
      <p className="text-muted">
        These are descriptions of one interaction, not rules for telling people from software, and not a complete
        list of what a real system looks at.
      </p>

      <h3 className="font-semibold">Strengths</h3>
      <ul className="list-disc space-y-1 pl-5 text-muted">
        <li>Very little friction for the user.</li>
        <li>Accessible when built from a native, semantic checkbox (name, state, keyboard).</li>
        <li>Useful as a visible entry point in a broader system.</li>
      </ul>

      <h3 className="font-semibold">Weaknesses</h3>
      <ul className="list-disc space-y-1 pl-5 text-muted">
        <li>A checkbox on its own proves nothing: it is trivial to activate programmatically.</li>
        <li>Any security comes from the wider system and context around it, not from the box.</li>
      </ul>

      <h3 className="font-semibold">Accessibility</h3>
      <p className="text-muted">
        This page uses a native checkbox: it has an accessible name, exposes checked/unchecked, takes keyboard
        focus (Tab) and toggles with Space (not Enter, as for any native checkbox). The result is text, not only
        color. Real systems may add further steps that are harder to use.
      </p>

      <h3 className="font-semibold">Automation considerations</h3>
      <p className="text-muted">
        A simple checkbox by itself is easy to automate. CaptchaLab uses it to study interaction and
        instrumentation. It does not integrate with, or automate, any third-party service.
      </p>

      <h3 className="font-semibold">Limits of this simulation</h3>
      <p className="text-muted">
        The verifier runs in your browser and is a demonstration, not production protection. CaptchaLab
        illustrates signals that a CAPTCHA system may use. It does not claim to reproduce the complete internal
        mechanisms of commercial CAPTCHA systems.
      </p>
    </section>
  );
}

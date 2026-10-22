/** Educational content for the Drag & Drop CAPTCHA (static; no data leaves the page). */
export function DragDropLearn() {
  return (
    <section aria-labelledby="learn-h" className="space-y-3 rounded-lg border border-line bg-panel p-4 text-sm" data-testid="learn">
      <h2 id="learn-h" className="text-base font-semibold">
        Learn: the drag and drop CAPTCHA
      </h2>
      <p className="text-muted">
        CaptchaLab illustrates signals that a CAPTCHA system may use. It does not claim to reproduce the complete
        internal mechanisms of commercial CAPTCHA systems.
      </p>

      <h3 className="font-semibold">How it works</h3>
      <p className="text-muted">
        You drag each shape onto the drop area that matches it. When every shape is placed, the challenge checks the
        final placements only: is each shape on its matching area? Your pointer events are normalized, kept in this
        browser tab, and shown in Inspect.
      </p>

      <h3 className="font-semibold">How the challenge is generated</h3>
      <p className="text-muted">
        A seeded generator places three shapes and three drop areas in two rows, shuffles which shape belongs where,
        and nudges the starting positions. All positions are fractions of the board, so the same challenge fits any
        screen size. The same seed always gives the same challenge.
      </p>

      <h3 className="font-semibold">Drop rule</h3>
      <p className="text-muted">
        The centre of the shape (not the pointer) is tested against each drop area&apos;s circle. A shape released on an
        area snaps to it, even a wrong one (a shape already there goes back to its start), and a release anywhere
        else sends it back. You keep the offset
        between where you grabbed the shape and its centre, so it does not jump under the pointer.
      </p>

      <h3 className="font-semibold">Signals that may be observed</h3>
      <ul className="list-disc space-y-1 pl-5 text-muted">
        <li>Reaction time to the first drag, and total time to finish.</li>
        <li>Drag duration and path length per attempt.</li>
        <li>Speed changes along each drag, and direction changes (corrections).</li>
        <li>Failed drops, cancelled drags and repeated attempts.</li>
        <li>How far from the target centre each shape was released.</li>
      </ul>
      <p className="text-muted">
        These describe one interaction. They are not rules for telling people from software and not a complete list
        of what a real system looks at.
      </p>

      <h3 className="font-semibold">Strengths</h3>
      <ul className="list-disc space-y-1 pl-5 text-muted">
        <li>Intuitive, and it exercises spatial reasoning and continuous movement rather than a single click.</li>
        <li>Produces richer interaction data than a checkbox.</li>
      </ul>

      <h3 className="font-semibold">Weaknesses</h3>
      <ul className="list-disc space-y-1 pl-5 text-muted">
        <li>Simple shape matching can be solved by software that reads the page or uses computer vision.</li>
        <li>Dragging can be hard or impossible for some people (motor impairments, small screens).</li>
        <li>On its own it is not enough for strong anti-abuse protection.</li>
      </ul>

      <h3 className="font-semibold">Accessibility</h3>
      <p className="text-muted">
        This challenge depends on a pointer. There is no keyboard alternative in this version, so keyboard-only users
        cannot complete it, and screen readers get names and state in words but no way to move the shapes. A
        keyboard design (select a shape, move between areas, place it) is on the backlog; it would need its own
        interaction model rather than imitating dragging.
      </p>

      <h3 className="font-semibold">Automation considerations</h3>
      <p className="text-muted">
        Simple geometry like this is automatable. CaptchaLab studies only its own lab challenge; it does not
        integrate with or automate any third-party service.
      </p>
    </section>
  );
}

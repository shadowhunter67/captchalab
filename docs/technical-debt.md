# Technical debt (post-MVP backlog)

Not release blockers unless stated. Format: issue · impact · affected CAPTCHA · priority.

## Cross-cutting
- Surface moved or CSS-transformed without resizing during a drag skews coordinates · wrong geometry in rare layouts · Slider, Drag & Drop, Rotation · later
- Event timeline markers overlap when events are dense · hard to click a marker with the mouse (Previous/Next works) · all · later
- Replay assumes one real pointer · multi-touch sessions replay incorrectly · all · post-MVP
- `getCoalescedEvents` not used · motion fidelity limited by event rate · Slider, Drag & Drop, Rotation · post-MVP
- React Compiler lint rules (eslint-plugin-react-hooks v7) not enabled · a few deliberate patterns would be flagged · web · later
- CI has never run on GitHub (no remote yet); no cache · first run may need small fixes · all · before release
- No issue/PR templates, no `examples/custom-captcha-plugin`, no LICENSE (owner decision) · release prep · all · before release (LICENSE)

## Text
- No non-visual alternative (audio or text) · blocks users who cannot read the image; documented on the page · Text · next accessibility pass
- Every Backspace/Delete after the first character counts as a correction, including no-op deletes · slightly inflated corrections · Text · later
- Characters are plain SVG text (trivial to read by software) · demo only, stated in Learn · Text · later

## Slider
- Off-centre grab adds an offset to release error (UI centres the handle) · slightly skewed features · Slider · later
- Replay cannot show the handle reset caused by "Try again" except through its marker · minor · Slider · later

## Checkbox
- Replay derives checked state from event parity; activation without pointer/key events is not replayable · assistive-tech sessions · Checkbox · later
- Space held across a blur leaves an orphan keydown; the next keydown is read as auto-repeat · press duration can be inflated · Checkbox · later

## Drag & Drop
- No keyboard alternative (draggables are `role="img"`) · not usable by keyboard-only users; documented on the page · Drag & Drop · next accessibility pass
- One session is analysed at one layout; a resize after input only shows a note · release errors of earlier drags approximate · Drag & Drop · later
- Snap/return in replay is instant · cosmetic · Drag & Drop · later

## Image Rotation
- Object centre is the value at Verify time; a resize mid-session is not tracked · angular features off after a resize · Rotation · later
- Keyboard turns have no angular velocity (instant steps) · by design; chart shows pointer drags only · Rotation · later

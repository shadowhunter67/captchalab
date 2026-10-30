# Known limitations (v1.0 release candidate)

CaptchaLab is an educational and research platform (release candidate). These limits are real; the full itemized list is in [technical-debt.md](technical-debt.md).

## What the results mean

- **The classifier is hand-written.** `behavioral-baseline@1` is a set of rules written by the authors. It is not trained on a real population and is **not a production bot detector**.
- **Human labels are user-provided.** A label in the dataset is whatever the person typed. There is no verified human population dataset, so evaluation numbers describe the data you loaded, not the world.
- **Nothing here proves who or what acted.** A pass, a metric or a label does not show that a person (or a program) made the interaction.
- **Verification runs in the browser.** The demo checks are not real protection against abuse.

## Coverage

- **Compare, Builder, the classifier and synthetic profiles do not cover every challenge.** They cover eleven challenges (Slider, Drag & Drop, Checkbox, Image Grid, Text, Rotation, Shape Matching, Math / Logic, Sequence, Memory, Audio). **MatchKey, Tile Game, Proof of Space, Browser Capability and Proof of Work have no deep classifier support.** The coverage matrix on the Learn page (`/learn#coverage`) shows each cell.
- Hybrid, Invisible Lab and Adaptive Lab are composed labs. Invisible and Adaptive only consume the existing classifier and add no rule.

## Accessibility

- **Drag & Drop** can be finished by keyboard alone (Enter or Space selects a shape, then Enter or Space on a drop area places it; Escape unselects) or by pointer. The keyboard flow is covered by automated tests, not checked with every screen reader.
- The Text challenge has no audio alternative. The Audio challenge has a link to a non-audio challenge.
- A checked pass over automated structure (ids, ARIA references, horizontal overflow at 360-400 px) is part of the test suite. This is not a WCAG certification.

## Platform

- **Browsers.** The full automated regression runs in **Chromium**. **Firefox and WebKit** run a targeted smoke suite of the main paths, not the full suite, so cross-browser coverage is partial. Replay and timing behavior are mostly checked in Chromium.
- **Audio**: one voice. If the device has no audio output the page reports that audio could not be started and points to the alternative challenge.
- **Audio (automation)**: Playwright's WebKit build on Windows has no Web Audio, so there the page shows its "not supported" message (with the alternative challenge) instead of playing; real playback is exercised in Chromium and Firefox.
- **Proof of Work and Proof of Space** run on the main thread in small slices with a Cancel button; there is no Worker. Proof of Space is a simulation, not a storage-hard protocol, and regions are at most 4 MB.
- **Memory** has no replay.
- Data is in memory only; reloading clears the dataset and experiments unless you exported them.

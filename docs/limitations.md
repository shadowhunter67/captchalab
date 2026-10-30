# Known limitations (v0.10 beta)

CaptchaLab is a beta educational and research platform. These limits are real; the full itemized list is in [technical-debt.md](technical-debt.md).

## What the results mean

- **The classifier is hand-written.** `behavioral-baseline@1` is a set of rules written by the authors. It is not trained on a real population and is **not a production bot detector**.
- **Human labels are user-provided.** A label in the dataset is whatever the person typed. There is no verified human population dataset, so evaluation numbers describe the data you loaded, not the world.
- **Nothing here proves who or what acted.** A pass, a metric or a label does not show that a person (or a program) made the interaction.
- **Verification runs in the browser.** The demo checks are not real protection against abuse.

## Coverage

- **Compare, Builder, the classifier and synthetic profiles do not cover every challenge.** They cover eleven challenges (Slider, Drag & Drop, Checkbox, Image Grid, Text, Rotation, Shape Matching, Math / Logic, Sequence, Memory, Audio). **MatchKey, Tile Game, Proof of Space, Browser Capability and Proof of Work have no deep classifier support.** The coverage matrix on the Learn page (`/learn#coverage`) shows each cell.
- Hybrid, Invisible Lab and Adaptive Lab are composed labs. Invisible and Adaptive only consume the existing classifier and add no rule.

## Accessibility

- **Drag & Drop has no complete keyboard alternative.** It needs a pointer. Other challenges (for example Slider, Checkbox, Text, Math / Logic) can be completed with the keyboard; the Drag & Drop page says so plainly.
- The Text challenge has no audio alternative. The Audio challenge has a link to a non-audio challenge.
- A checked pass over automated structure (ids, ARIA references, horizontal overflow at 360-400 px) is part of the test suite. This is not a WCAG certification.

## Platform

- **Audio**: one voice. Audio, replay and timing behavior have been tested most heavily in **Chromium**; Firefox and Safari are not covered by the automated suite.
- **Proof of Work and Proof of Space** run on the main thread in small slices with a Cancel button; there is no Worker. Proof of Space is a simulation, not a storage-hard protocol, and regions are at most 4 MB.
- **Memory** has no replay.
- Data is in memory only; reloading clears the dataset and experiments unless you exported them.

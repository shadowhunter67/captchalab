# Technical debt (post-MVP backlog)

Not release blockers unless stated. Format: issue · impact · affected CAPTCHA · priority.

## Cross-cutting
- Surface moved or CSS-transformed without resizing during a drag skews coordinates · wrong geometry in rare layouts · Slider, Drag & Drop, Rotation · later
- Event timeline markers overlap when events are dense · hard to click a marker with the mouse (Previous/Next works) · all · later
- Replay assumes one real pointer · multi-touch sessions replay incorrectly · all · post-MVP
- `getCoalescedEvents` not used · motion fidelity limited by event rate · Slider, Drag & Drop, Rotation · post-MVP
- React Compiler lint rules (eslint-plugin-react-hooks v7) not enabled · a few deliberate patterns would be flagged · web · later
- CI has never run on GitHub (no remote yet); no cache · first run may need small fixes · all · before release
- No `examples/custom-captcha-plugin` · contributor docs · all · post-alpha

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

## Image Grid
- Click-only activation (assistive tech, voice control) toggles a tile without pointer/key events, so it is not recorded · features undercount · Image Grid · later
- Space is recorded at keydown, but a native button activates on keyup; an aborted press (focus lost between) can be recorded without a toggle · timing slightly early · Image Grid · later
- Tile labels name the shape (non-visual alternative) so software can read them trivially · demo only, stated on the page · Image Grid · later

## Compare
- The Slider target is conveyed visually only, so the human half needs sight; the synthetic half works without an attempt · Compare · next accessibility pass
- Compare now covers six CAPTCHAs (see the v0.5 section); the other six are not wired · Compare · later

- Language: Vietnamese by default, English via the VI/EN switch (`lib/i18n`, `?lang=` in the URL, nothing stored). The suite runs in English through `e2e/fixtures.ts`. Input-modality values (mouse/touch/keyboard) are shown untranslated.

## Variants and difficulty (v0.2)
- Image Grid has no 4x4 variant (`GRID_SIZE` is shared by the verifier and UI) · backlog · Image Grid · later
- Text has no "distorted" variant (would need a canvas/filter pipeline) · only Clean, Rotated, Noisy · Text · later
- Classic Rotation shows its start range as an angle (40°–320°), not a shortest displacement · wording only · Rotation · later
- `parameterRows` lists a fixed set of parameters per CAPTCHA; a new preset parameter must also be added there · Inspect · later
- No Custom mode yet (presets first) · all · later
- Seeds are numbers up to 4294967295; a URL seed above that is ignored · all · later

## Shape Matching, Math / Logic, Sequence (v0.3)
- Shape Matching has no replay and no drag interaction (select-then-select only) · by design for now · Shape Matching · later
- Math / Logic comparison asks for the larger value, not for a side; "type the larger value" could be mistaken for typing a side label · wording · Math / Logic · later
- Number sequences are checked for a single answer only against four pattern families (arithmetic, geometric, alternating, interleaved), simplest first; other rules are not considered · documented in `sequence/rules.ts` · Sequence · later
- Sequence visual patterns use shapes only (no colour or size patterns) · Sequence · later
- Compare and the Behavioral Lab do not cover these CAPTCHAs yet (v0.5 covers six others) · all new CAPTCHAs · later

## Memory, Proof of Work, Audio (v0.4)
- Memory has no replay of the recall order · Memory · later
- The Proof of Work search runs on the main thread in small chunks (no Web Worker, no fallback); a very weak device can still be slow on the hard levels, and Cancel is the only brake · Proof of Work · later
- Proof of Work shows no progress percentage (the number of hashes needed is random) · Proof of Work · later
- Audio has one voice (English digits only, recorded with Windows SAPI "Zira"), no letters and no Vietnamese clips · Audio · later
- Audio has no text or non-audio equivalent beyond the link to another challenge, by design; deaf and hard-of-hearing users cannot use it · Audio · documented limitation
- Audio noise is plain white noise, mixed in the browser; no band-limiting or room effects · Audio · later
- Browser-specific audio behaviour (autoplay policies, Safari AudioContext start) is not tested beyond Chromium · Audio · later
- Compare and the Behavioral Lab do not cover these CAPTCHAs yet (v0.5 covers six others) · all new CAPTCHAs · later

## Behavioral Lab (v0.5)
- The classifier ranges and weights are hand-set, not fitted to real people; there is no labeled human dataset, so no accuracy or confusion matrix can be shown · Behavioral Lab · needs opt-in data (v0.6+)
- Noisy / Variable synthetic profiles read as Human-like by design of the baseline; a rule baseline cannot separate them · Classifier · later (shown in the evaluation panel)
- Memory, Math, Sequence, Audio, Proof of Work and Shape Matching are not in the Behavioral Lab · Compare · later
- Image Grid and Checkbox have few events, so rhythm signals are often missing (`null`) and the classifier leans on two or three signals · Classifier · later
- The synthetic Drag & Drop, Image Grid and Rotation sessions assume a default layout when there is no human attempt (480x320 board, 3x3 pitch 100 px, object centre 120,120); with an attempt they use the human's layout · Compare · later
- The Slider's Compare human side still needs sight (the target is visual); the Invisible demo is keyboard-usable, but a keyboard-only run has no motion signals · Accessibility · next pass
- Text uses the character-key timing only; key hold time (dwell) is not a signal · Text · later
- Invisible demo: one fixed task (four targets); no timing noise from slow devices is modelled · Invisible demo · later
- The generated reference distribution is 30 runs on the main thread; it is fast today but would need a worker for heavier profiles · Compare · later
- Signal definitions are versioned (`behavior-signals@1`) but there is no stored data to migrate yet · Behavioral Lab · when export arrives

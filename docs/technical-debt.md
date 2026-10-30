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

## Challenge builder and experiments (v0.6)
- Eleven of the twelve CAPTCHAs are supported by the builder and the workspace (Proof of Work is excluded by design) · Builder / Experiments · by design
- There are no custom challenge parameters beyond variant, difficulty and seed, because the plugins take none; real custom parameters need a declarative parameter schema in the plugin contract · Builder · later
- Nothing persists (by design): reloading loses an experiment that was not exported; a persistent workspace would need an explicit, opt-in design · Experiments · later
- One challenge per experiment; cross-challenge or cross-CAPTCHA grouping is not supported · Experiments · later
- Hard limits (100 recorded sessions, 300 synthetic runs, 12 batches, 25 MB per file); the table lists 100 rows and charts draw 24 sessions. Larger experiments would need paging or a Web Worker, which was not needed in measurements · Experiments · later
- No accuracy, precision, recall, ROC, AUC or confusion matrix: there are no validated labels, and a user-labelled dataset is separate future work · Experiments · later
- The classifier is still the hand-set `behavioral-baseline@1`; nothing imported retunes it, and no threshold override exists · Classifier · later
- The checksum in a bundle is not a signature and proves no origin; a signed format would need key management · Data formats · later
- `startedAt` is exported as 0, so the time of a session is not kept; timestamps that matter would need an explicit field and a privacy review · Data formats · later
- A forged file can claim a challenge it was not recorded on (provenance is claimed, not authenticated); only accidental mixing is prevented · Data formats · later
- Import accepts only version 1 of each format; migrations will be needed when a version 2 exists · Data formats · later
- The tag and note fields are plain text only; there is no Markdown · Experiments · by design
- The download uses a Blob URL and an anchor; browsers that block programmatic downloads would need a manual save-as fallback · Experiments · later

## Eleven-CAPTCHA coverage (v0.7)
- Proof of Work is excluded from the Behavioral Lab by design (its features describe the computation); it is the only CAPTCHA without behavioral coverage · Behavioral Lab · by design
- The rules for the five new CAPTCHAs are hand-set like the others, with the same ranges for the shared signals; typing speed for Math / Audio (where people stop to think or listen) may deserve its own ranges once real data exists · Classifier · later
- Memory's recorded recall start comes from the page's own clock mark; a session imported without it (`null`) has no recall actions at all, so its recall signals are missing · Memory · later
- Synthetic Sequence profiles are about timing, not about keys versus clicks, so the number and visual variants share names but differ in the events they write · Sequence · later
- Audio synthetic sessions assume clip lengths from the digit count and gap, not from the real audio duration · Audio · later
- Shape Matching, Memory and Sequence have no path view; they compare timelines like Checkbox and Image Grid · Compare · by design

## Labeled dataset (v0.8)
- The dataset is in memory only and lost on reload unless exported; persistence would need an explicit, opt-in design · Dataset · later
- A label is user-provided, never verified; there is no way to prove a session was made by a person · Dataset · by design
- No accuracy, precision, recall, F1, ROC, AUC, confusion matrix or label/classifier agreement is computed; that is the evaluation step · Dataset · next release
- Labels are one per session; no multiple annotators, no label history, no confidence, no bulk labeling · Dataset · later
- Limits (500 records, 300,000 events, 25 MB, 2 million values): a long-session dataset can reach the value limit first; larger sets would need paging or a worker · Dataset · later
- The store is shared by the pages of one tab only; the home page frames each page in its own document, so a dataset built inside a frame is not shared with other frames (open the pages directly) · Dataset · later
- Imported synthetic records from another generator version cannot be regenerated, so their provenance is unchecked (a warning is shown) · Dataset · when `synthetic@2` exists
- The Invisible demo and Proof of Work cannot be added (the first is not a CAPTCHA, the second has no behavioral reading) · Dataset · by design
- Notes are free text (200 characters); a person can still type personal information into one, and the exported file keeps it · Dataset · by design (a warning is shown)


## Fast completion (v0.9)
- MatchKey, Tile Game, Proof of Space and Browser Capability are not in the classifier, Compare, Dataset evaluation, the synthetic profiles or the Builder; the coverage matrix says "—" for each. Deep behavioral support is deferred · Behavioral Lab · later
- Invisible and Adaptive only consume `behavioral-baseline@1` and its simulated escalation; they add no rule. The classifier is still hand-set, with no baseline@2 · Classifier · later
- Proof of Space is a simulation (a deterministic function, tiny regions up to 4 MB), not a storage-hard protocol; the fill runs on the main thread in 64 KB slices, with no Worker · Proof of Space · later
- Hybrid is a composition rule in `lib/hybrid`, not a plugin; there is no PoW + Text or PoW + Image Grid hybrid, and its stages are not recorded as one session · Hybrid · later
- Browser Capability checks the existence of six APIs by name only and keeps no value; it cannot tell a capable browser from a spoofed one · Browser Capability · by design
- Evaluation reads the local dataset only: no per-annotator labels, no cross-validation, no confidence intervals, and the threshold sandbox does not change `DEFAULT_THRESHOLDS` · Evaluation · by design
- The taxonomy is hand-assigned (one family per entry); an entry that spans families (a Hybrid, Checkbox) sits in one · Taxonomy · by design
- Not built: Distorted Text as a separate challenge, a 4x4 Image Grid, Memory replay, extra Audio voices · Challenges · later
- Hybrid and the labs have no Learn section of their own, only a short card; the sidebar entries are available from the home page · Learn · later

## Beta stabilization (v0.10)
- Drag & Drop still has no complete keyboard alternative (a select-source / select-target fallback needs a new controller path); the limitation is stated on its page, in Learn and in `docs/limitations.md`, and keyboard-operable challenges exist · Drag & Drop · later
- Radio buttons in Compare and the native file inputs measure under 24 px as controls; their labels or the browser's own control make the effective target larger · Compare / import · later
- Firefox and Safari are not in the automated suite; Audio, replay and timing are checked mostly in Chromium · Platform · later
- Hybrid stage ids are scoped with `IdScope` (`lib/id-scope.tsx`); other pages still use fixed ids, which is safe because only one session is mounted per page; a new page that mounts two sessions must wrap each in an `IdScope` · Hybrid / a11y · by design

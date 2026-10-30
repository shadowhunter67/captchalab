# CaptchaLab

**Explore. Interact. Understand.**

CaptchaLab is an **educational and research platform**. It offers generic CAPTCHA implementations in a controlled environment, so you can try a challenge and then see what your own interaction looked like: the events, the speed and path of your mouse, and a replay of your attempt. It also includes an **experimental** behavioral classifier for studying interaction signals. Everything runs in your browser.

It is not a bot-detection product, not a production anti-bot solution and not a replacement for any commercial CAPTCHA.

**Live demo: https://shadowhunter67.github.io/captchalab/** (pick a challenge on the left, try it on the right)

> **Status: Release candidate (`1.0.0-rc.1`).** A freeze of behavior for 1.0: no new challenge families, and the classifier (`behavioral-baseline@1`), the dataset format and the evaluation math are unchanged since 0.10. See the [release notes](docs/releases/v1.0.0-rc.1.md), the [known limitations](docs/limitations.md) and the [privacy notes](docs/privacy.md).

The site is in **Vietnamese by default**. Use the **VI / EN** button in the top-right corner to switch to English.

## Product map

| Area | Where | What it is for |
|---|---|---|
| **Playground** | `/playground` | Try each challenge and lab, grouped by family, and inspect your own interaction. |
| **Behavior** | `/behavior` | The behavioral signals and the experimental classifier. |
| **Compare** | `/compare` | A recorded attempt next to a generated one, signal by signal. |
| **Builder** | `/builder` | Define a reproducible challenge (variant, difficulty, seed) and save it as a small file. |
| **Experiments** | `/experiments` | Several local sessions and synthetic batches, exported to a file and imported again. |
| **Dataset** | `/experiments/dataset` | A local dataset with labels you set yourself. |
| **Evaluation** | `/experiments/evaluation` | How the classifier's reading compares with those labels (read-only, with a local threshold sandbox). |
| **Learn** | `/learn` | How each challenge works, what it does not prove, and the coverage matrix. |

## What you can try

The challenges and composed labs below, each with its own page and grouped by family (Visual, Cognitive, Audio, Computational, Behavioral, Environment, Hybrid). CaptchaLab covers major CAPTCHA and anti-abuse challenge families through generic educational implementations; it does not cover every commercial system and does not reproduce their internals. The full table, with what each entry supports, is on the Learn page (`/learn#coverage`).

| Challenge | What you do |
|---|---|
| Slider | Drag a handle to a target |
| Checkbox | Tick a checkbox |
| Drag & Drop | Drop shapes onto matching spots |
| Image Rotation | Turn an object until it is upright |
| Text | Read distorted letters and type them |
| Image Grid | Pick all the tiles that show a given shape |
| Shape Matching | Match each shape to its counterpart (exact, or turned/outlined/resized) |
| Math / Logic | Work out a calculation, or type the larger of two values |
| Sequence | Find the missing number or shape in a pattern |
| Memory | Watch a sequence or some lit cells, then recall them |
| Proof of Work | Your device computes a proof (this shows effort, not that you are human) |
| Audio | Listen to spoken digits and type them (with a link to a non-audio alternative) |
| MatchKey | Pick the option that matches a key shape (exactly, or by attribute) |
| Tile Game | Find the identical pair, or the tiles that share a named attribute |
| Proof of Space | Your device fills a small memory region and proves it (this shows memory and time, not that you are human) |
| Browser Capability | Press once to see which basic browser APIs exist, as plain yes or no (not a fingerprint) |

And composed labs: **Hybrid** (Proof of Work then Slider, or then Audio; passes only when both stages pass), **Invisible Lab** (a neutral task observed only after you press Start), and **Adaptive Lab** (the existing experimental classifier's label mapped to a *simulated* next-challenge suggestion; nothing is blocked or redirected).

Each challenge has **variants** (for example Clean, Rotated or Noisy text, a Number or Visual sequence, or Spoken digits) and three **difficulty levels** (Easy, Medium, Hard), plus a **seed**. The same seed, variant and difficulty always give the same challenge, and the page shows exactly what the difficulty changed (tolerance, number of noise lines...). A link such as `/playground/text/?variant=noisy&difficulty=hard&seed=742193` opens that exact challenge.

After each attempt you can look at:

- the result and a few simple measurements (time, speed, corrections...),
- a timeline of the events you produced,
- the path your pointer took, where it applies,
- a replay of your attempt.

There are a few extra pages:

- **Learn**: a short explanation of how each challenge works, its strengths and weaknesses, and how behavioral ("invisible") CAPTCHA works.
- **Behavioral Lab**: record an attempt, set it next to a computer-generated one on the very same challenge, and see which signals differ (timing, motion, corrections, rhythm). Works for eleven challenges: Slider, Drag & Drop, Checkbox, Image Grid, Text, Rotation, Shape Matching, Math / Logic, Sequence, Memory and Audio (Proof of Work is left out on purpose: it measures your device's computation, not an interaction). An **experimental** rule-based classifier reads both as *Human-like*, *Synthetic-like* or *Uncertain* and shows its evidence. It is a lab toy for CaptchaLab's own data: it never gives a percentage and does not prove whether a real person is human or automated. See [docs/behavioral-lab.md](docs/behavioral-lab.md).
- **Compare**: the side-by-side view of the Behavioral Lab, with a signal table, a path or timing view and optional generated reference runs.
- **Challenge builder** (`/builder`): pick a CAPTCHA, variant, difficulty and seed, preview and try the exact challenge, and download it as a small versioned file.
- **Experiments** (`/experiments`): record several local sessions on one challenge, add deterministic synthetic batches, compare signals and the classifier's evidence, then export the whole experiment to a file and import it again to reproduce it. Everything stays in your browser; nothing is saved unless you download it. See [docs/experiment-workbench.md](docs/experiment-workbench.md) and [docs/data-formats.md](docs/data-formats.md).
- **Labeled dataset** (`/experiments/dataset`): add sessions you choose to a local dataset, give each a label you set yourself (human, synthetic or unknown), keep the source apart from the label, and export or import the set as a file. A label is user-provided, not verified ground truth, and it is never the classifier's output. The dataset lives only in your browser tab until you export it. See [docs/datasets.md](docs/datasets.md).
- **Classifier evaluation** (`/experiments/evaluation`): read-only. It compares the classifier's reading with the labels in your local dataset (Unknown is left out, Uncertain is counted apart, small groups say "Insufficient sample") and has a threshold sandbox that changes only a local copy. Experiments, Dataset and Evaluation link to each other.
- **Behavioral demo**: a tiny click-the-target task that shows a *simulated* escalation suggestion. Nothing is ever blocked or redirected.

## Privacy

Your interaction data stays in your browser tab. It is not uploaded, not saved, and there are no analytics. Typed letters are never recorded: for the Text challenge only the kind of key (letter, digit, backspace...) is kept. The Audio challenge uses no microphone, and Browser Capability answers only yes or no per API (no timing, no fingerprint). The dataset is in memory only and exports are always user-triggered. An automated test checks that no network requests or storage writes happen while you play. Details: [docs/privacy.md](docs/privacy.md).

## What this is not

CaptchaLab is only for learning and research on challenges that it creates itself. It is **not** a tool to bypass, solve or automate CAPTCHAs on other websites, and it will not accept contributions for that. Its demo checks run in the browser, so it is **not** real protection against abuse (see [SECURITY.md](SECURITY.md)).

It also does not claim to copy how commercial CAPTCHA systems work, and none of its measurements can tell a person from a program.

## Run it on your computer

You need Node.js (version in [.nvmrc](.nvmrc)) with Corepack.

```bash
corepack pnpm install
corepack pnpm --filter web dev      # open http://localhost:3000
```

To check the project: `corepack pnpm -r run lint`, `corepack pnpm -r run typecheck`, `corepack pnpm -r run test`, and `corepack pnpm --filter web test:e2e` for the browser tests. More in [docs/deployment.md](docs/deployment.md).

## Known limitations

- The Text challenge has no audio or text alternative. Drag & Drop can be finished with the keyboard (select a shape, then a drop area), but that flow has not been checked with every screen reader.
- The Behavioral Lab leaves out Proof of Work, Proof of Space, Browser Capability, MatchKey and Tile Game; the matrix on the Learn page shows each gap, and its classifier is a hand-set baseline, not trained on real people.
- **Browsers:** the full automated regression runs in Chromium. Firefox and WebKit (Safari's engine) run a targeted smoke suite of the main paths (Slider, Drag & Drop by keyboard and pointer, Text, Audio, Memory, Proof of Work, Proof of Space, Hybrid, Browser Capability, Dataset, Evaluation). That is not full cross-browser coverage; replay and timing details are mostly checked in Chromium. Playwright's WebKit build on Windows has no Web Audio, so there the Audio page shows its "not supported" message; real playback is exercised in Chromium and Firefox.
- The consolidated limits are in [docs/limitations.md](docs/limitations.md); the full itemized list is in [docs/technical-debt.md](docs/technical-debt.md).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). To add a new challenge, follow [docs/adding-a-captcha.md](docs/adding-a-captcha.md). Please also read the [Code of Conduct](CODE_OF_CONDUCT.md). Design decisions are in [docs/adr](docs/adr).

## License

Apache License 2.0. See [LICENSE](LICENSE).

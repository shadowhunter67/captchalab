# Experiment workbench (v0.6)

A reproducible, browser-local research workflow:

```text
build → run → record → synthesize → compare → export → (clear) → import → reproduce
```

It is experimental local tooling. It is not a bot-detection benchmark and it makes no accuracy claim. See [behavioral-lab.md](behavioral-lab.md) for the signals and the classifier, which v0.6 leaves unchanged, and [data-formats.md](data-formats.md) for the files.

## Routes

| Route | What |
|---|---|
| `/builder` | Build a challenge: CAPTCHA, variant, difficulty, seed (typed, generated or copied). Validates, previews and lets you try the exact challenge. Download or import a `challenge-definition@1`. Hand the definition to Experiments or Compare. |
| `/experiments` | The workspace: one challenge, many locally recorded sessions, deterministic synthetic batches, filters, per-cohort descriptive statistics, distributions, trajectories or timelines of selected sessions, per-session classifier evidence, export and import. |
| `/compare?captcha=&variant=&difficulty=&seed=` | The existing one-sample Compare, now openable from a definition. |

URL parameters carry only four small fields (CAPTCHA, variant, difficulty, seed). Sessions and experiments are never put in the URL.

## Builder

- Controls come from the plugin's own variant sets (`VARIANT_SETS`), so they cannot drift from what the plugins can generate. There are no free-form parameters.
- An invalid configuration shows an alert listing what is wrong and builds nothing. Nothing is silently repaired.
- The seed changes only when you press **Generate seed** or type one. Editing the name, variant or level never changes it. The same definition and seed always give the same challenge.
- The preview is the real challenge, playable; an attempt there stays in memory and is dropped when any defining field changes.

## Workspace

- **One challenge per experiment.** Changing the challenge means starting a new experiment (the Builder link says so), so no session can be compared against a different challenge.
- **Recorded sessions** are called "recorded/local sessions": they are not a validated human dataset. Each is added explicitly (up to 100), with an optional label and neutral tags (for example `run-1`, `test-condition-a`). Do not use sensitive or demographic tags.
- **Synthetic batches** are recipes `{profile, baseSeed, runs}`; run `i` uses `baseSeed + i`. Limits: 100 runs per batch, 12 batches, 300 runs in total. They are measured in the layout of the first recorded session if there is one, else the default layout, and that layout is stored with the batch.
- **Statistics** are descriptive: count, missing, min, max, mean, median. `null` stays missing and is counted separately, never as 0. No test, no p-value, no significance.
- **Classifier**: each session shows its output (Human-like, Synthetic-like, Uncertain) and its full evidence. The experiment shows **counts** of outputs per cohort, not percentages, accuracy, precision, recall, ROC or a confusion matrix: there are no validated labels.
- **Views**: trajectories for Slider, Drag & Drop and Rotation; timelines for Checkbox, Image Grid and Text. At most 24 selected sessions are drawn; the table lists the first 100.
- **Filters** (kind, synthetic profile, classifier output, signal group) only change what is shown; they never change the data.

## State and persistence

Everything is in memory. There is no localStorage, IndexedDB, cookie or server. Unexported changes are flagged, and the browser asks before the page is left or reloaded. Importing a challenge or an experiment over existing data needs an explicit confirmation, and a replaced experiment leaves nothing behind (selection, inspected session, filters, the half-recorded session and notices are all reset). A session file is added to the current experiment only if it is on exactly the same challenge.

## Reproducing an experiment

Export **experiment-bundle@1**, clear or reload, import it. The challenge, the recorded events, the synthetic recipes, the notes, and therefore every signal and classifier output come back identical. The bundle records the challenge identity and plugin version, the seeds, the pipeline versions (`synthetic@1`, `behavior-signals@1`, `behavioral-baseline@1`) and a checksum. Only the creation time and file name vary.

## Bounds and measured cost

Hard limits keep the page responsive: 100 recorded sessions, 300 synthetic runs, 12 batches, 25 MB per file. A single-run measurement on the author's machine (Node, not a benchmark): deriving, extracting signals and classifying 400 sessions took about 40 ms for Slider and 75 ms for Drag & Drop; exporting about 0.9 and 1.5 MB took about 30 and 45 ms; importing took a similar time. No Web Worker is used because none was needed.

## Not done (see technical-debt.md)

Only six CAPTCHAs are covered; the classifier is still the hand-set `behavioral-baseline@1` and nothing in an experiment retunes it; no persistent workspace, no cloud sync, no labeled datasets, no statistical evaluation, no production anti-bot use.

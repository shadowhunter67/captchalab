# Data formats (v0.6)

CaptchaLab writes and reads four small JSON formats. They are produced in the browser, saved only when the user presses a download button, and read back only when the user chooses a file. Nothing is uploaded or stored automatically.

Code: `apps/web/lib/research/` (`definition.ts`, `formats.ts`, `safe.ts`). Tests: `apps/web/lib/research/__tests__/research.test.ts`.

## Compatibility policy

- Every format has an integer `version` (today always `1`). **A file with another version is rejected** with "unsupported format version". It is never reinterpreted.
- The version is judged first, before any other field is read.
- Objects are **strict**: an unknown field is an error, not ignored. A file means exactly what it says, and a typo cannot silently drop data.
- Pipeline versions inside a bundle (`signals`, `classifier`, `syntheticGenerator`) are separate from the format version, so `synthetic@2`, `behavior-signals@2` and `behavioral-baseline@2` can coexist later. On import: a different *signals* or *classifier* version is read with a visible warning (the app recomputes with its own); a different *synthetic generator* version is **refused** when the bundle contains synthetic batches, because they could not be reproduced.
- `null` means "not measurable" and is never turned into `0`. Derived signal values are never stored in files; they are recomputed on import.

## `challenge-definition@1`

The reproducible identity of one challenge.

| Field | Required | Meaning |
|---|---|---|
| `format` | yes | `"challenge-definition"` |
| `version` | yes | `1` |
| `captcha` | yes | `slider`, `drag-drop`, `checkbox`, `image-grid`, `text`, `rotation`, `shape-matching`, `math-logic`, `sequence`, `memory` or `audio` |
| `pluginVersion` | yes | version of the plugin that generated it; a different plugin version is refused (it could build another challenge) |
| `variant`, `difficulty` | yes | must exist for that CAPTCHA (a variant may not offer every level) |
| `seed` | yes | whole number, 0 to 4294967295 |
| `parameters` | yes | flat snapshot of the preset parameters; checked against what the plugin generates today |
| `name` | no | up to 80 characters of plain text; descriptive only |

The same `captcha + variant + difficulty + seed` always rebuilds exactly the same challenge. There are no free-form parameters: a plugin's parameters come from its variant and difficulty presets.

```json
{
 "format": "challenge-definition",
 "version": 1,
 "captcha": "text",
 "pluginVersion": "1.0.0",
 "variant": "noisy",
 "difficulty": "hard",
 "seed": 31,
 "parameters": { "length": 6, "noiseLines": 10 },
 "name": "Noisy text"
}
```

(The exact `parameters` depend on the plugin; a real file comes from the builder's download button.)

## `interaction-session@1`

One session on one challenge.

| Field | Required | Meaning |
|---|---|---|
| `format`, `version` | yes | `"interaction-session"`, `1` |
| `challenge` | yes | a full `challenge-definition@1` object |
| `source` | yes | `{ "kind": "recorded" }` or `{ "kind": "synthetic", "profile", "generator": "synthetic@N", "seed" }` |
| `session` | yes | the lab's `InteractionSession` (schema 2): `id`, `captchaId`, `durationMs`, `events`, `inputModality`, `startedAt`, optional `viewport` |
| `context` | per CAPTCHA | slider `{trackLeft, trackWidth, handleWidth}`, drag-drop `{width, height}`, rotation `{center:{x,y}}`, memory `{recallStartMs: number or null}`; **absent** for the others |
| `label`, `tags`, `passed`, `createdAt` | no | plain-text label (80), up to 12 tags, whether the challenge was passed, ISO time |

`source.kind` is provenance, not a verdict: importing a file never makes a session "human". `startedAt` (a wall-clock time) is exported as `0` because analysis never uses it. Events keep coordinates relative to the challenge surface and, for Text, only the coarse key class (`Letter`, `Digit`, `Backspace`, `Enter`...), never the typed characters. The session must belong to the same CAPTCHA as its challenge and must be analysable against it, or it is refused.

## `experiment-bundle@1`

Everything needed to reproduce a local experiment.

| Field | Required | Meaning |
|---|---|---|
| `format`, `version` | yes | `"experiment-bundle"`, `1` |
| `name`, `notes` | yes | plain text (80 / 5000 characters) |
| `createdAt` | yes | ISO time; descriptive, **not** part of the checksum |
| `challenge` | yes | one `challenge-definition@1` |
| `versions` | yes | `{ sessionSchema, signals, classifier, syntheticGenerator }`, e.g. `2`, `behavior-signals@1`, `behavioral-baseline@1`, `synthetic@1` |
| `recorded` | yes | up to 100 of `{ id, label, tags, session, context?, passed?, source? }` |
| `synthetic` | yes | up to 12 recipes `{ id, profile, baseSeed, runs, context? }`, at most 100 runs each and 300 in total |
| `integrity` | yes | `{ "algorithm": "sha256-canonical-json", "value": "<64 hex>" }` |

Synthetic batches are stored as **recipes**, not data: run `i` uses seed `(baseSeed + i) mod 2^32` on the experiment's one challenge, so the same bundle always rebuilds the same sessions and the file stays small. A recorded session stays on the exact challenge of the bundle, so recorded and generated sessions can never refer to different challenges.

`integrity` is a SHA-256 over the canonical JSON (keys sorted at every level) of everything except `createdAt` and `integrity`. It detects accidental edits and is **not a signature**: a mismatch is shown as a warning and the file is still read. It proves nothing about who made the file.

What is exact after export and import: the challenge identity, every recorded event, the recipes, the notes and tags, and therefore every derived signal, classifier output and synthetic session. What is intentionally variable: `createdAt`, the file name, and the exported `startedAt` (always `0`).

## `captchalab-labeled-dataset@1`

A separate format for the local labeled dataset (user-provided labels, source, session, recomputed-on-import signals). It is not one of the formats above and has its own version. See [datasets.md](datasets.md).

## `experiment-summary@1`

A compact, **one-way** description (it cannot be imported): the challenge definition, the pipeline versions and, per cohort (recorded sessions, each synthetic batch), the number of sessions, the **counts of classifier outputs** and per-signal descriptive statistics (`count`, `missing`, `min`, `max`, `mean`, `median`). No events, no coordinates. The classifier counts are counts of outputs; they are not accuracy and not probabilities.

## Security considerations

An imported file is untrusted input and is only ever data.

- Size is checked before reading (limit 25 MB). The text is then scanned once, before parsing, for nesting depth (16) and the number of values (2 million), so `JSON.parse` never sees a file built to blow up memory; the parsed tree is walked again iteratively for depth, node count and string length (20,000). A bundle may hold at most 150,000 events in total.
- The keys `__proto__`, `constructor` and `prototype` are rejected anywhere in the file. Objects are rebuilt field by field; nothing is merged into an existing object.
- A typing session (`text-input`, `math-input`, `audio-input`, `sequence-input`) may hold only key classes (`Letter`, `Digit`, `Other`) and control keys; a session that says which key was typed is refused (v0.8).
- Every number must be finite and inside a range; events, arrays, tags and ids have length and character limits. Coordinates, times and counts are validated, not trusted.
- Text fields (names, labels, notes, tags) are plain text, rejected if they contain control characters, and are rendered by React as text, never as HTML.
- No part of a file is evaluated: no code, expressions, templates, callbacks or dynamic imports.
- File names are built from `[a-z0-9-]` only (`captchalab-<kind>-<part>.json`).
- A failed import changes nothing and shows a readable message, never a stack trace.
- **Provenance is claimed, not proven.** A session file says which challenge it belongs to, and the importer refuses a mismatch with the experiment it joins, which prevents accidentally mixing sessions of different challenges. A file that was edited on purpose can still claim a challenge it was not recorded on; the checksum is not a signature, and nothing here authenticates a file.
- Exports leave out the wall-clock time of the interaction (`startedAt` is `0`) and the viewport size, but they do contain the session `id`, the creation time, and any name, label, tag or note you typed. Free text may contain personal information: do not write any, and check a file before sharing it.

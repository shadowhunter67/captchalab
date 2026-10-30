# Privacy

CaptchaLab is an educational and research lab. It has no backend, no database and no analytics. This page states what the code does with your data; every point is checked by an automated test (`e2e/privacy.ts` watches the network, console, storage, IndexedDB and cookies on each challenge page).

## What happens to your interaction

- **Raw events stay in the browser tab.** Pointer, keyboard and timing events of an attempt are kept in memory so the page can show them to you. They are never uploaded.
- **Nothing is persisted by default.** There is no `localStorage`, `sessionStorage`, IndexedDB or cookie use. Reloading the page clears everything.
- **No network requests carry your data.** The only requests while you play are the page's own static files (and the local audio clips for the Audio challenge).
- **No console logging of events.** Failures log a short message without event data.
- **No analytics, tracking or third-party scripts.**

## Typed text and keys

For text-like inputs only the **class** of a key is recorded (letter, digit, backspace, ...). The letter or digit itself is never stored in the session, and the typed value is not echoed back. A test asserts that no stored event names a specific letter or digit key.

## Dataset, experiments and exports

- The labeled dataset and experiments live **in memory** in the current tab. Reloading clears them; the page asks before you leave with unexported changes.
- **Exports are user-triggered.** A file is created only when you press an export button, and you decide where it goes.
- **Imports are local.** A chosen file is read in your browser and never uploaded. An imported file is treated as untrusted data (size, depth and key limits; signals and classifier output are recomputed).
- A note you type in the dataset is free text: do not put personal information in it, because an export keeps it.

## Specific modules

- **Audio**: plays CaptchaLab's own local clips. It uses **no microphone** and asks for no permission.
- **Browser Capability**: answers only **yes or no** per API (does it exist?). It measures **no device-performance timing** (no check or computation duration; the generic event timeline shows when you pressed Run, as on every page), calls nothing, reads no value, creates no hash, score or identifier, and stores nothing. It is not a fingerprint.
- **Drag & Drop (keyboard)**: records only Enter, Space or Escape together with the name of the shape or drop area it acted on; no other key is handled or stored, and nothing typed.
- **Invisible Lab**: records only after you press Start, only inside its own pad, and stops when the run ends or you press Stop.
- **Adaptive Lab**: reads generated (synthetic) examples only; it observes nothing from you.
- **Synthetic sessions** are generated locally by CaptchaLab and are labeled as synthetic.

## What CaptchaLab does not do

It does not identify you, build a profile, track you across pages or sessions, or send anything to a server. The classifier's label ("human-like", "synthetic-like", "uncertain") is an experimental reading of one interaction and is never stored or attached to a person.

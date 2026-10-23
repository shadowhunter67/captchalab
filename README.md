# CaptchaLab

**Explore. Interact. Understand.**

CaptchaLab is a small lab where you try different CAPTCHA challenges and then see what your own interaction looked like: the events, the speed and path of your mouse, and a replay of your attempt. It is made for learning and research. Everything runs in your browser.

**Live demo: https://shadowhunter67.github.io/captchalab/**

> **Status: Alpha (`0.1.0-alpha`).** Things may still change.

## What you can try

Six challenges, each with its own page:

| Challenge | What you do |
|---|---|
| Slider | Drag a handle to a target |
| Checkbox | Tick a checkbox |
| Drag & Drop | Drop shapes onto matching spots |
| Image Rotation | Turn an object until it is upright |
| Text | Read distorted letters and type them |
| Image Grid | Pick all the tiles that show a given shape |

After each attempt you can look at:

- the result and a few simple measurements (time, speed, corrections...),
- a timeline of the events you produced,
- the path your pointer took, where it applies,
- a replay of your attempt.

There are two extra pages:

- **Learn**: a short explanation of how each challenge works, its strengths and weaknesses.
- **Compare**: your Slider drag next to a computer-generated one (Linear, Eased or Noisy), so you can see how they differ. It only describes differences. It does not give a "bot score".

## Privacy

Your interaction data stays in your browser tab. It is not uploaded, not saved, and there are no analytics. Typed letters are never recorded: for the Text challenge only the kind of key (letter, digit, backspace...) is kept. An automated test checks that no network requests or storage writes happen while you play.

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

- Drag & Drop has no keyboard alternative yet, and the Text challenge has no audio or text alternative.
- Compare only uses the Slider.
- The full list is in [docs/technical-debt.md](docs/technical-debt.md).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). To add a new challenge, follow [docs/adding-a-captcha.md](docs/adding-a-captcha.md). Please also read the [Code of Conduct](CODE_OF_CONDUCT.md). Design decisions are in [docs/adr](docs/adr).

## License

Apache License 2.0. See [LICENSE](LICENSE).

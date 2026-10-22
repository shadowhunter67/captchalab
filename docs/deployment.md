# Deployment

CaptchaLab's web app is a Next.js 16 app whose pages are all statically prerendered (`○ Static` in the build output).
There is no server code, no API route, no database and no environment variable.

## Build and run

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm --filter web build
corepack pnpm --filter web start      # http://localhost:3000
```

Any host that runs `next start` works. Because every page is static, a static host also works if you enable
Next's `output: "export"` in `apps/web/next.config.ts` (not enabled today; verify the build and the E2E suite
against the exported files before relying on it).

## Privacy requirements for any deployment

- Do not add analytics, tag managers, error-reporting SDKs or session-replay tools. The E2E privacy test fails on
  any network request made while interacting, but it cannot see a script you add at the host or CDN level.
- Serve over HTTPS. Do not log request bodies; the app sends none.
- Keep the disclaimer text (Learn and Compare pages): the lab is educational and the demo verifiers are not
  production security.

## Before the first public release

- The repository owner must choose and add a `LICENSE` file (not chosen yet).
- Push to GitHub and confirm the CI workflow passes once (it has only run locally in `CI=true` mode).

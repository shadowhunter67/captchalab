# Security policy

## What CaptchaLab is (and is not)

CaptchaLab is an educational and research lab. Its challenges and verifier are **demonstrations**: verification runs in the browser, which is not a trusted environment, so the result can be forged by design. **Do not use CaptchaLab to protect a real service.** It is not production anti-abuse software.

## Reporting a vulnerability

If you find a security problem in CaptchaLab itself, please report it **privately**:

- Use GitHub's private vulnerability reporting for this repository (Security tab → "Report a vulnerability") when it is enabled.
- If it is not enabled, open a public issue that says only that you have a security report and ask for a private channel. **Do not include exploit details, proof-of-concept code or user data in a public issue.**

Please give what you can: affected version/commit, steps to reproduce, and the impact. We will acknowledge reports as soon as the maintainers can; this is a volunteer-run alpha project and there is no guaranteed response time.

## In scope

- Cross-site scripting or injection in the web app.
- Anything that causes raw interaction data (events, coordinates, key codes) to leave the browser, be stored, or be logged, contrary to the privacy statement in the README.
- Vulnerable dependencies that affect the app or the build.
- Secrets accidentally committed to the repository.

## Out of scope

- "The demo verifier can be bypassed or forged." That is a known property of a client-side demo, not a vulnerability.
- Requests for, or reports about, bypassing third-party CAPTCHAs or evading anti-bot systems. CaptchaLab does not support that goal and will not accept such features.
- Denial of service against a locally run development server.

## Supported versions

Only the latest commit on the default branch is supported while the project is in alpha.

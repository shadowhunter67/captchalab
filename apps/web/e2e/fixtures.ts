import { test as base, expect } from "@playwright/test";

export { expect };

/** The app is Vietnamese by default; the suite asserts English text, so every navigation asks for `lang=en`. */
function withLang(url: string): string {
  if (/[?&]lang=/.test(url)) return url;
  const [path = "", hash] = url.split("#");
  const joined = `${path}${path.includes("?") ? "&" : "?"}lang=en`;
  return hash === undefined ? joined : `${joined}#${hash}`;
}

export const test = base.extend({
  page: async ({ page }, provide) => {
    const goto = page.goto.bind(page);
    page.goto = (url, options) => goto(withLang(url), options);
    await provide(page);
  },
});

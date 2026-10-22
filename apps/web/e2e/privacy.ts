import { expect, type Page } from "@playwright/test";

/**
 * Reusable privacy assertion for EVERY CAPTCHA page (see docs/adding-a-captcha.md).
 *
 * Call `watchPrivacy(page)` right after `page.goto(...)` (it installs spies in the page), perform
 * the interaction, then `await assertNoDataLeft()`. It fails if, since the call:
 *  - any network request was made,
 *  - anything was logged to the console,
 *  - localStorage / sessionStorage were written to (even if later cleared),
 *  - an IndexedDB database was opened,
 *  - a cookie was set.
 */
export async function watchPrivacy(page: Page): Promise<() => Promise<void>> {
  await page.waitForLoadState("networkidle");
  const requests: string[] = [];
  const logs: string[] = [];
  page.on("request", (r) => requests.push(`${r.method()} ${r.url()}`));
  page.on("console", (m) => logs.push(m.text()));

  await page.evaluate(() => {
    const w = window as unknown as { __privacyWrites: string[] };
    w.__privacyWrites = [];
    const record = (what: string) => () => void w.__privacyWrites.push(what);
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (this: Storage, key: string, value: string) {
      record(this === window.localStorage ? "localStorage.setItem" : "sessionStorage.setItem")();
      return setItem.call(this, key, value);
    };
    const openDb = indexedDB.open.bind(indexedDB);
    indexedDB.open = (...args: Parameters<IDBFactory["open"]>) => {
      record("indexedDB.open")();
      return openDb(...args);
    };
    const cookie = Object.getOwnPropertyDescriptor(Document.prototype, "cookie");
    if (cookie?.set) {
      const set = cookie.set;
      Object.defineProperty(document, "cookie", {
        configurable: true,
        get: () => cookie.get?.call(document) as string,
        set: (v: string) => {
          record("document.cookie")();
          set.call(document, v);
        },
      });
    }
  });

  return async () => {
    const writes = await page.evaluate(() => (window as unknown as { __privacyWrites: string[] }).__privacyWrites);
    expect(requests, "network requests during interaction").toEqual([]);
    expect(logs, "console output during interaction").toEqual([]);
    expect(writes, "storage / IndexedDB / cookie writes during interaction").toEqual([]);
    const left = await page.evaluate(() => localStorage.length + sessionStorage.length);
    expect(left).toBe(0);
  };
}

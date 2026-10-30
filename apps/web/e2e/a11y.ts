import { expect, type Page } from "@playwright/test";

export interface IdProblems {
  duplicates: string[];
  broken: string[];
  overflow: number;
}

/**
 * Structural accessibility check of the current DOM: duplicate ids, and aria-labelledby / aria-describedby /
 * aria-controls / label[for] that point at nothing. Also the horizontal overflow of the page in pixels.
 */
export async function idProblems(page: Page): Promise<IdProblems> {
  return page.evaluate(() => {
    const counts = new Map<string, number>();
    for (const el of Array.from(document.querySelectorAll("[id]"))) counts.set(el.id, (counts.get(el.id) ?? 0) + 1);
    const duplicates = [...counts].filter(([, n]) => n > 1).map(([id, n]) => `${id} x${n}`);
    const broken: string[] = [];
    const check = (attr: string, el: Element, ids: string[]): void => {
      for (const id of ids) if (id && !document.getElementById(id)) broken.push(`${el.tagName.toLowerCase()}[${attr}=${id}]`);
    };
    for (const el of Array.from(document.querySelectorAll("[aria-labelledby]"))) check("aria-labelledby", el, (el.getAttribute("aria-labelledby") ?? "").split(/\s+/));
    for (const el of Array.from(document.querySelectorAll("[aria-describedby]"))) check("aria-describedby", el, (el.getAttribute("aria-describedby") ?? "").split(/\s+/));
    for (const el of Array.from(document.querySelectorAll("[aria-controls]"))) check("aria-controls", el, (el.getAttribute("aria-controls") ?? "").split(/\s+/));
    for (const el of Array.from(document.querySelectorAll("label[for]"))) check("for", el, [el.getAttribute("for") ?? ""]);
    const overflow = Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth);
    return { duplicates, broken, overflow };
  });
}

export async function expectValidIds(page: Page): Promise<void> {
  const p = await idProblems(page);
  expect(p.duplicates, "duplicate element ids").toEqual([]);
  expect(p.broken, "ARIA / label references with no target").toEqual([]);
}

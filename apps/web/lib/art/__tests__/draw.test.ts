import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ART_CATEGORIES } from "@captchalab/captcha-plugins";
import { drawObject, inkFor, inkWith } from "../draw";

const svg = (node: unknown): string => renderToStaticMarkup(createElement("svg", null, node as never));

describe("illustrations", () => {
  it("the same category and seed always draw the same picture", () => {
    for (const c of ART_CATEGORIES) for (const seed of [0, 1, 99, 123456]) expect(svg(drawObject(c, inkFor(seed)))).toBe(svg(drawObject(c, inkFor(seed))));
  });

  it("the colourway of a skinned card is visible on EVERY object (a tree and a traffic light are not exempt)", () => {
    // MatchKey and Tile Game use the colour as a rule: two cards that differ only in colour must look different.
    for (const c of ART_CATEGORIES) {
      const red = svg(drawObject(c, inkWith("#d94f4f")));
      const blue = svg(drawObject(c, inkWith("#2f7fd1")));
      const green = svg(drawObject(c, inkWith("#3a9a5b")));
      expect(new Set([red, blue, green]).size, c).toBe(3);
    }
  });

  it("a silhouette is one flat colour: no other fill or stroke colour appears", () => {
    for (const c of ART_CATEGORIES) {
      const m = svg(drawObject(c, inkFor(5, "currentColor")));
      const colours = [...m.matchAll(/(?:fill|stroke)="([^"]+)"/g)].map((x) => x[1]).filter((v) => v !== "none");
      expect(new Set(colours), c).toEqual(new Set(["currentColor"]));
    }
  });

  it("different objects look different", () => {
    const drawings = ART_CATEGORIES.map((c) => svg(drawObject(c, inkWith("#d94f4f"))));
    expect(new Set(drawings).size).toBe(ART_CATEGORIES.length);
  });
});

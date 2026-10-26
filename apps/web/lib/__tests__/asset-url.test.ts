import { describe, expect, it } from "vitest";
import { assetUrl } from "../asset-url";

describe("assetUrl", () => {
  it("is rooted at / when there is no base path", () => {
    expect(assetUrl("audio/digits/4.wav", "")).toBe("/audio/digits/4.wav");
  });
  it("puts the GitHub Pages base path in front", () => {
    expect(assetUrl("audio/digits/4.wav", "/captchalab")).toBe("/captchalab/audio/digits/4.wav");
  });
  it("tolerates stray slashes", () => {
    expect(assetUrl("/audio/a.wav", "/captchalab/")).toBe("/captchalab/audio/a.wav");
    expect(assetUrl("//audio/a.wav", "")).toBe("/audio/a.wav");
  });
});

import { describe, expect, it } from "vitest";
import { createRng } from "@captchalab/captcha-core";
import { registry, verifyPosAnswer } from "@captchalab/captcha-plugins";
import { childUnlocked, hybridVerdict, isHybridKind, withOutcome, type HybridStages } from "../hybrid";

const exp = { powId: "pow-1", childId: "child-1" };
const none: HybridStages = { pow: null, child: null };
const ok = (id: string) => ({ challengeId: id, passed: true });
const bad = (id: string) => ({ challengeId: id, passed: false });

describe("hybrid verdict: both stages are required", () => {
  it("PoW valid + child invalid -> fail", () => {
    const v = hybridVerdict(exp, { pow: ok("pow-1"), child: bad("child-1") });
    expect(v).toMatchObject({ passed: false, reason: "child-failed", pow: "passed", child: "failed" });
  });
  it("PoW invalid + child valid -> fail", () => {
    const v = hybridVerdict(exp, { pow: bad("pow-1"), child: ok("child-1") });
    expect(v).toMatchObject({ passed: false, reason: "pow-failed", child: "pending" });
  });
  it("both valid -> pass", () => {
    expect(hybridVerdict(exp, { pow: ok("pow-1"), child: ok("child-1") })).toMatchObject({ passed: true, reason: "passed" });
  });
  it("nothing yet, or only one stage -> not passed", () => {
    expect(hybridVerdict(exp, none)).toMatchObject({ passed: false, reason: "pow-missing" });
    expect(hybridVerdict(exp, { pow: ok("pow-1"), child: null })).toMatchObject({ passed: false, reason: "child-missing" });
    expect(hybridVerdict(exp, { pow: null, child: ok("child-1") })).toMatchObject({ passed: false, reason: "pow-missing" });
  });
  it("outcomes about another challenge are stale and count for nothing", () => {
    expect(hybridVerdict(exp, { pow: ok("old-pow"), child: ok("child-1") }).passed).toBe(false);
    expect(hybridVerdict(exp, { pow: ok("pow-1"), child: ok("old-child") })).toMatchObject({ passed: false, reason: "child-missing" });
    expect(hybridVerdict({ powId: "pow-2", childId: "child-2" }, { pow: ok("pow-1"), child: ok("child-1") }).passed).toBe(false);
  });
  it("a later child outcome replaces the earlier one; clearing it resets", () => {
    let s = withOutcome({ pow: ok("pow-1"), child: null }, "child", bad("child-1"));
    expect(hybridVerdict(exp, s).passed).toBe(false);
    s = withOutcome(s, "child", ok("child-1"));
    expect(hybridVerdict(exp, s).passed).toBe(true);
    s = withOutcome(s, "child", null);
    expect(hybridVerdict(exp, s)).toMatchObject({ passed: false, reason: "child-missing" });
  });
  it("a child outcome kept without a valid PoW cannot pass", () => {
    expect(hybridVerdict(exp, { pow: bad("pow-1"), child: ok("child-1") }).child).toBe("pending");
  });
});

describe("second stage gate", () => {
  it("opens only when the first stage passed for the current challenge", () => {
    expect(childUnlocked(exp, none)).toBe(false);
    expect(childUnlocked(exp, { pow: bad("pow-1"), child: null })).toBe(false);
    expect(childUnlocked(exp, { pow: ok("old"), child: null })).toBe(false);
    expect(childUnlocked(exp, { pow: ok("pow-1"), child: null })).toBe(true);
  });
});

describe("composition with the real plugins", () => {
  it("an invalid PoW proof from the plugin fails the whole hybrid even if the slider is right", () => {
    const pow = registry.get("proof-of-work").generate({ rng: createRng(1), variantId: "hash-prefix", difficulty: "easy" });
    const slider = registry.get("slider").generate({ rng: createRng(2) });
    const powPassed = registry.get("proof-of-work").verify(pow, { nonce: 0 }, {} as never).passed; // nonce 0 is almost surely wrong
    const sliderPassed = registry.get("slider").verify(slider, { position: slider.target }, {} as never).passed;
    expect(sliderPassed).toBe(true);
    const v = hybridVerdict({ powId: pow.id, childId: slider.id }, { pow: { challengeId: pow.id, passed: powPassed }, child: { challengeId: slider.id, passed: sliderPassed } });
    expect(v.passed).toBe(powPassed);
    // Proof of Space is not part of a hybrid: its verifier alone is untouched by this module.
    expect(verifyPosAnswer(null as never, {}).passed).toBe(false);
  });
  it("kinds are recognised", () => {
    expect(isHybridKind("pow-visual") && isHybridKind("pow-audio")).toBe(true);
    expect(isHybridKind("x") || isHybridKind(null)).toBe(false);
  });
});

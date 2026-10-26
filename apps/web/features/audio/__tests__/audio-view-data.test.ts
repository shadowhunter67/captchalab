import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { AudioFeatures } from "@captchalab/captcha-plugins";
import { audioMetrics, playLabel, statusText } from "../audio-view-data";

const VI = (vi: string, _en: string): string => vi;
const features = {
  reactionTime: 300,
  timeToFirstPlay: 300,
  playCount: 1,
  timeToFirstKey: null,
  completionTime: 2000,
  keyCount: 0,
  backspaceCount: 0,
  correctionCount: 0,
  attemptCount: 0,
  timeFromLastPlayToEnd: 1700,
  eventCount: 4,
  inputModality: "mouse",
} as unknown as AudioFeatures;

describe("audioMetrics", () => {
  it("has the expected ids in order", () => {
    expect(audioMetrics(features).map((m) => m.id)).toEqual([
      "reactionTime",
      "timeToFirstPlay",
      "playCount",
      "timeToFirstKey",
      "completionTime",
      "keyCount",
      "backspaceCount",
      "correctionCount",
      "attemptCount",
      "timeFromLastPlayToEnd",
      "eventCount",
      "inputModality",
    ]);
  });
  it("keeps null as null (shown as a dash, never 0)", () => {
    expect(audioMetrics(features).find((x) => x.id === "timeToFirstKey")).toMatchObject({ value: null });
  });
  it("translates labels", () => {
    expect(audioMetrics(features, VI)[2]?.label).toBe("Số lần phát");
    expect(audioMetrics(features)[2]?.label).toBe("Plays");
  });
});

describe("playLabel and statusText", () => {
  it("is Play first, Replay afterwards", () => {
    expect(playLabel(false)).toBe("Play");
    expect(playLabel(true)).toBe("Replay");
    expect(playLabel(true, VI)).toBe("Phát lại");
  });
  it("describes the state", () => {
    expect(statusText("playing")).toBe("Playing…");
    expect(statusText("idle")).toBe("Ready");
    expect(statusText("loading")).toBe("Loading audio…");
    expect(statusText("playing", VI)).toBe("Đang phát…");
  });
});

describe("no microphone, no speech synthesis", () => {
  it.each(["audio-player.ts", "AudioSession.tsx"])("%s never touches them", (file) => {
    const text = readFileSync(join(__dirname, "..", file), "utf8");
    expect(text).not.toMatch(/getUserMedia|MediaRecorder|mediaDevices|speechSynthesis|SpeechSynthesis/);
  });
});

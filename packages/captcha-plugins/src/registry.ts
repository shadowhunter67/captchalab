import { createPluginRegistry } from "@captchalab/captcha-core";
import { checkboxPlugin } from "./checkbox";
import { dragDropPlugin } from "./drag-drop";
import { imageGridPlugin } from "./image-grid";
import { audioPlugin } from "./audio";
import { browserCapabilityPlugin } from "./browser-capability";
import { mathLogicPlugin } from "./math-logic";
import { matchKeyPlugin } from "./match-key";
import { memoryPlugin } from "./memory";
import { proofOfSpacePlugin } from "./proof-of-space";
import { proofOfWorkPlugin } from "./proof-of-work";
import { rotationPlugin } from "./rotation";
import { sequencePlugin } from "./sequence";
import { shapeMatchingPlugin } from "./shape-matching";
import { sliderPlugin } from "./slider";
import { textPlugin } from "./text";
import { tileGamePlugin } from "./tile-game";

/** Compile-time registry: add new CAPTCHAs to this object; types flow from here. */
export const registry = createPluginRegistry({
  slider: sliderPlugin,
  checkbox: checkboxPlugin,
  "drag-drop": dragDropPlugin,
  rotation: rotationPlugin,
  text: textPlugin,
  "image-grid": imageGridPlugin,
  "shape-matching": shapeMatchingPlugin,
  "math-logic": mathLogicPlugin,
  sequence: sequencePlugin,
  memory: memoryPlugin,
  "proof-of-work": proofOfWorkPlugin,
  audio: audioPlugin,
  "match-key": matchKeyPlugin,
  "tile-game": tileGamePlugin,
  "proof-of-space": proofOfSpacePlugin,
  "browser-capability": browserCapabilityPlugin,
});

export type CaptchaRegistry = typeof registry;

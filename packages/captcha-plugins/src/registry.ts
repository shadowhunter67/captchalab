import { createPluginRegistry } from "@captchalab/captcha-core";
import { checkboxPlugin } from "./checkbox";
import { dragDropPlugin } from "./drag-drop";
import { imageGridPlugin } from "./image-grid";
import { mathLogicPlugin } from "./math-logic";
import { rotationPlugin } from "./rotation";
import { sequencePlugin } from "./sequence";
import { shapeMatchingPlugin } from "./shape-matching";
import { sliderPlugin } from "./slider";
import { textPlugin } from "./text";

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
});

export type CaptchaRegistry = typeof registry;

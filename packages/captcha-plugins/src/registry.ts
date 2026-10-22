import { createPluginRegistry } from "@captchalab/captcha-core";
import { checkboxPlugin } from "./checkbox";
import { dragDropPlugin } from "./drag-drop";
import { rotationPlugin } from "./rotation";
import { sliderPlugin } from "./slider";

/** Compile-time registry: add new CAPTCHAs to this object; types flow from here. */
export const registry = createPluginRegistry({
  slider: sliderPlugin,
  checkbox: checkboxPlugin,
  "drag-drop": dragDropPlugin,
  rotation: rotationPlugin,
});

export type CaptchaRegistry = typeof registry;

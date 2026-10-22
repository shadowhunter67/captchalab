import { createPluginRegistry } from "@captchalab/captcha-core";
import { checkboxPlugin } from "./checkbox";
import { sliderPlugin } from "./slider";

/** Compile-time registry: add new CAPTCHAs to this object; types flow from here. */
export const registry = createPluginRegistry({
  slider: sliderPlugin,
  checkbox: checkboxPlugin,
});

export type CaptchaRegistry = typeof registry;

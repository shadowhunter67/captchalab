import type { ArtCategory } from "@captchalab/captcha-plugins";
import type { Translate } from "@/lib/i18n";

/** How a prompt names an illustrated object: [Vietnamese, English]. Only used in prompts and Learn, never as a tile's accessible name. */
const NAMES: Readonly<Record<ArtCategory, readonly [string, string]>> = {
  bicycle: ["xe đạp", "bicycle"],
  bus: ["xe buýt", "bus"],
  car: ["ô tô", "car"],
  boat: ["thuyền", "boat"],
  airplane: ["máy bay", "airplane"],
  cat: ["con mèo", "cat"],
  dog: ["con chó", "dog"],
  bird: ["con chim", "bird"],
  tree: ["cái cây", "tree"],
  flower: ["bông hoa", "flower"],
  "traffic-light": ["đèn giao thông", "traffic light"],
  house: ["ngôi nhà", "house"],
  umbrella: ["cái ô", "umbrella"],
  chair: ["cái ghế", "chair"],
};

export const artLabel = (category: ArtCategory, t: Translate): string => t(NAMES[category][0], NAMES[category][1]);

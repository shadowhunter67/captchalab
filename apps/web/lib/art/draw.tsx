import type { ReactNode } from "react";
import { createRng } from "@captchalab/captcha-core";
import { ART_SCENES_FOR, type ArtCategory, type ArtScene } from "@captchalab/captcha-plugins";

/**
 * CaptchaLab's own vector illustrations (v1.1). Everything is drawn here from a category and a seed: original flat
 * drawings in a 100x100 box, no file, no download, no third-party image. The same (category, seed) always draws the same
 * picture. A silhouette draws the same shape in one flat colour, so a drop target or a matching card can show an object
 * without giving it away by colour.
 */
export interface Ink {
  body: string;
  accent: string;
  dark: string;
  glass: string;
  /** When set, every part is drawn in this one colour. */
  sil: string | null;
}

const BODY = ["#d94f4f", "#e08a1e", "#2f7fd1", "#3a9a5b", "#8a5bd0", "#d0577f", "#1f9aa3", "#c9a227"];
const ACCENT = ["#ffffff", "#f3e9c6", "#dfe9f7"];

export function inkFor(seed: number, sil: string | null = null): Ink {
  const rng = createRng(seed);
  return {
    body: BODY[Math.floor(rng() * BODY.length)] as string,
    accent: ACCENT[Math.floor(rng() * ACCENT.length)] as string,
    dark: "#2b2f3a",
    glass: "#cfe6fb",
    sil,
  };
}

/** An ink with a chosen body colour (the colourways of the skinned MatchKey and Tile Game). */
export const inkWith = (body: string): Ink => ({ body, accent: "#ffffff", dark: "#2b2f3a", glass: "#cfe6fb", sil: null });

const f = (k: Ink, c: string): string => k.sil ?? c;

function bicycle(k: Ink): ReactNode {
  return (
    <g strokeLinecap="round" strokeLinejoin="round" fill="none">
      <g stroke={f(k, k.dark)} strokeWidth="3.4">
        <circle cx="26" cy="64" r="15" />
        <circle cx="74" cy="64" r="15" />
      </g>
      <g stroke={f(k, k.body)} strokeWidth="3.4">
        <path d="M26 64 L44 64 L38 40 M44 64 L62 40 M38 40 L62 40 M62 40 L74 64" />
      </g>
      <g stroke={f(k, k.dark)} strokeWidth="3">
        <path d="M32 37 L43 37 M62 40 L61 32 M56 31 L67 31" />
      </g>
      <circle cx="44" cy="64" r="3" fill={f(k, k.dark)} stroke="none" />
    </g>
  );
}

function bus(k: Ink): ReactNode {
  return (
    <g>
      <rect x="12" y="28" width="76" height="40" rx="7" fill={f(k, k.body)} />
      <rect x="12" y="52" width="76" height="6" fill={f(k, k.accent)} />
      {[19, 33, 47, 61].map((x) => (
        <rect key={x} x={x} y="34" width="11" height="13" rx="2" fill={f(k, k.glass)} />
      ))}
      <rect x="75" y="34" width="9" height="18" rx="2" fill={f(k, k.glass)} />
      <circle cx="30" cy="70" r="8.5" fill={f(k, k.dark)} />
      <circle cx="70" cy="70" r="8.5" fill={f(k, k.dark)} />
      <circle cx="30" cy="70" r="3" fill={f(k, k.accent)} />
      <circle cx="70" cy="70" r="3" fill={f(k, k.accent)} />
    </g>
  );
}

function car(k: Ink): ReactNode {
  return (
    <g>
      <path d="M10 64 L10 54 Q10 49 16 48 L28 47 L38 34 Q40 32 44 32 L62 32 Q66 32 68 35 L77 47 L86 49 Q91 51 91 57 L91 64 Z" fill={f(k, k.body)} />
      <path d="M41 36 L61 36 L70 47 L34 47 Z" fill={f(k, k.glass)} />
      <rect x="50" y="36" width="2" height="11" fill={f(k, k.body)} />
      <circle cx="28" cy="65" r="9.5" fill={f(k, k.dark)} />
      <circle cx="73" cy="65" r="9.5" fill={f(k, k.dark)} />
      <circle cx="28" cy="65" r="3.5" fill={f(k, k.accent)} />
      <circle cx="73" cy="65" r="3.5" fill={f(k, k.accent)} />
      <rect x="85" y="52" width="6" height="4" rx="1" fill={f(k, "#ffe27a")} />
    </g>
  );
}

function boat(k: Ink): ReactNode {
  return (
    <g>
      <path d="M14 62 L86 62 L75 78 L26 78 Z" fill={f(k, k.body)} />
      <rect x="14" y="60" width="72" height="4" fill={f(k, k.accent)} />
      <rect x="49" y="18" width="3" height="44" fill={f(k, k.dark)} />
      <path d="M51 20 L51 58 L24 58 Z" fill={f(k, k.accent)} />
      <path d="M54 28 L54 58 L78 58 Z" fill={f(k, k.body)} opacity={k.sil ? 1 : 0.85} />
      <path d="M52 18 L62 21 L52 24 Z" fill={f(k, k.dark)} />
    </g>
  );
}

function airplane(k: Ink): ReactNode {
  return (
    <g>
      <path d="M22 46 L12 26 L26 26 L38 44 Z" fill={f(k, k.body)} />
      <ellipse cx="52" cy="50" rx="38" ry="8.5" fill={f(k, k.accent)} />
      <path d="M44 53 L64 53 L48 76 L38 76 Z" fill={f(k, k.body)} />
      <path d="M44 47 L62 47 L50 30 L41 30 Z" fill={f(k, k.body)} opacity={k.sil ? 1 : 0.92} />
      {[40, 48, 56, 64, 72].map((x) => (
        <circle key={x} cx={x} cy="49" r="1.7" fill={f(k, k.glass)} />
      ))}
      <path d="M82 46 Q92 49 88 53 L80 54 Z" fill={f(k, k.dark)} />
    </g>
  );
}

function cat(k: Ink): ReactNode {
  return (
    <g>
      <path d="M68 78 Q92 76 88 52 Q86 46 82 50 Q84 66 66 66 Z" fill={f(k, k.body)} />
      <ellipse cx="50" cy="66" rx="20" ry="19" fill={f(k, k.body)} />
      <circle cx="50" cy="38" r="16" fill={f(k, k.body)} />
      <path d="M36 30 L38 14 L48 24 Z M64 30 L62 14 L52 24 Z" fill={f(k, k.body)} />
      <path d="M39 26 L40 19 L45 24 Z M61 26 L60 19 L55 24 Z" fill={f(k, k.accent)} opacity={k.sil ? 0 : 0.8} />
      <ellipse cx="50" cy="72" rx="9" ry="10" fill={f(k, k.accent)} opacity={k.sil ? 0 : 0.85} />
      <circle cx="44" cy="37" r="2.4" fill={f(k, k.dark)} />
      <circle cx="56" cy="37" r="2.4" fill={f(k, k.dark)} />
      <path d="M48 43 L52 43 L50 46 Z" fill={f(k, k.dark)} />
      <path d="M30 42 L42 44 M30 48 L42 46 M70 42 L58 44 M70 48 L58 46" stroke={f(k, k.dark)} strokeWidth="1.2" fill="none" />
    </g>
  );
}

function dog(k: Ink): ReactNode {
  return (
    <g>
      <path d="M22 52 Q10 44 12 34 Q18 38 24 46 Z" fill={f(k, k.body)} />
      <rect x="20" y="46" width="48" height="24" rx="11" fill={f(k, k.body)} />
      {[26, 34, 56, 63].map((x) => (
        <rect key={x} x={x} y="62" width="6" height="22" rx="3" fill={f(k, k.body)} />
      ))}
      <circle cx="74" cy="42" r="13" fill={f(k, k.body)} />
      <rect x="78" y="42" width="16" height="11" rx="5" fill={f(k, k.body)} />
      <ellipse cx="66" cy="40" rx="5" ry="10" fill={f(k, k.dark)} opacity={k.sil ? 0 : 0.55} />
      <circle cx="78" cy="38" r="2.2" fill={f(k, k.dark)} />
      <circle cx="92" cy="44" r="2.6" fill={f(k, k.dark)} />
    </g>
  );
}

function bird(k: Ink): ReactNode {
  return (
    <g>
      <rect x="14" y="80" width="72" height="4" rx="2" fill={f(k, "#8a5a2b")} />
      <path d="M30 50 L8 42 L10 58 L30 58 Z" fill={f(k, k.dark)} />
      <ellipse cx="48" cy="54" rx="23" ry="16" fill={f(k, k.body)} />
      <circle cx="72" cy="40" r="11" fill={f(k, k.body)} />
      <path d="M81 38 L94 43 L81 46 Z" fill={f(k, "#e7a52a")} />
      <path d="M36 52 Q50 40 62 56 Q50 64 36 56 Z" fill={f(k, k.dark)} opacity={k.sil ? 1 : 0.6} />
      <circle cx="75" cy="38" r="2" fill={f(k, k.dark)} />
      <path d="M46 68 L44 80 M54 68 L56 80" stroke={f(k, "#e7a52a")} strokeWidth="2.4" strokeLinecap="round" />
    </g>
  );
}

function tree(k: Ink): ReactNode {
  return (
    <g>
      <rect x="44" y="50" width="12" height="36" rx="2" fill={f(k, "#7a4e2a")} />
      <circle cx="50" cy="34" r="22" fill={f(k, "#2f8a4b")} />
      <circle cx="32" cy="50" r="15" fill={f(k, "#3aa05b")} />
      <circle cx="68" cy="50" r="15" fill={f(k, "#3aa05b")} />
      <circle cx="44" cy="30" r="6" fill={f(k, "#56b774")} opacity={k.sil ? 0 : 0.7} />
    </g>
  );
}

function flower(k: Ink): ReactNode {
  const petals = [0, 60, 120, 180, 240, 300].map((a) => [50 + 14 * Math.cos((a * Math.PI) / 180), 32 + 14 * Math.sin((a * Math.PI) / 180)] as const);
  return (
    <g>
      <rect x="48" y="44" width="4" height="42" rx="2" fill={f(k, "#2f8a4b")} />
      <ellipse cx="36" cy="68" rx="12" ry="5" transform="rotate(-25 36 68)" fill={f(k, "#3aa05b")} />
      <ellipse cx="64" cy="62" rx="12" ry="5" transform="rotate(25 64 62)" fill={f(k, "#3aa05b")} />
      {petals.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="9.5" fill={f(k, k.body)} />
      ))}
      <circle cx="50" cy="32" r="7.5" fill={f(k, "#f3c93d")} />
    </g>
  );
}

function trafficLight(k: Ink): ReactNode {
  const lit = k.body.charCodeAt(1) % 3;
  const colors = ["#e0443e", "#f0b429", "#2fb36d"];
  return (
    <g>
      <rect x="47" y="60" width="6" height="28" fill={f(k, "#6b7280")} />
      <rect x="35" y="10" width="30" height="52" rx="7" fill={f(k, k.dark)} />
      {[0, 1, 2].map((i) => (
        <circle key={i} cx="50" cy={24 + i * 13} r="5.6" fill={f(k, i === lit ? (colors[i] as string) : "#454c5c")} />
      ))}
    </g>
  );
}

function house(k: Ink): ReactNode {
  return (
    <g>
      <rect x="66" y="20" width="9" height="20" fill={f(k, "#8a5a2b")} />
      <rect x="20" y="46" width="60" height="38" fill={f(k, k.accent)} />
      <path d="M13 48 L50 16 L87 48 Z" fill={f(k, k.body)} />
      <rect x="44" y="60" width="13" height="24" fill={f(k, k.dark)} />
      <rect x="26" y="54" width="12" height="12" fill={f(k, k.glass)} />
      <rect x="62" y="54" width="12" height="12" fill={f(k, k.glass)} />
    </g>
  );
}

function umbrella(k: Ink): ReactNode {
  return (
    <g>
      <path d="M8 52 A42 38 0 0 1 92 52 Q81 60 71 52 Q60 60 50 52 Q40 60 29 52 Q19 60 8 52 Z" fill={f(k, k.body)} />
      <path d="M50 14 Q38 28 36 52 M50 14 Q62 28 64 52 M50 14 L50 52" stroke={f(k, k.accent)} strokeWidth="1.6" fill="none" opacity={k.sil ? 0 : 0.8} />
      <path d="M50 52 L50 80 Q50 90 41 90 Q35 90 35 84" stroke={f(k, k.dark)} strokeWidth="3.6" fill="none" strokeLinecap="round" />
      <circle cx="50" cy="12" r="2.4" fill={f(k, k.dark)} />
    </g>
  );
}

function chair(k: Ink): ReactNode {
  return (
    <g>
      <rect x="28" y="12" width="9" height="46" rx="2" fill={f(k, k.body)} />
      {[16, 26, 36].map((y) => (
        <rect key={y} x="28" y={y} width="34" height="6" rx="2" fill={f(k, k.body)} />
      ))}
      <rect x="26" y="52" width="46" height="9" rx="3" fill={f(k, k.body)} />
      <rect x="28" y="60" width="7" height="26" rx="2" fill={f(k, k.dark)} />
      <rect x="64" y="60" width="7" height="26" rx="2" fill={f(k, k.dark)} />
      <rect x="40" y="60" width="5" height="22" rx="2" fill={f(k, k.dark)} opacity="0.7" />
    </g>
  );
}

const DRAW: Readonly<Record<ArtCategory, (k: Ink) => ReactNode>> = {
  bicycle,
  bus,
  car,
  boat,
  airplane,
  cat,
  dog,
  bird,
  tree,
  flower,
  "traffic-light": trafficLight,
  house,
  umbrella,
  chair,
};

export const drawObject = (category: ArtCategory, k: Ink): ReactNode => DRAW[category](k);

// ---------------------------------------------------------------------------------------------------- scenes

/** A flat scene behind an object. Small seeded details (clouds, blades, windows) keep two tiles of one scene from being identical. */
export function drawScene(scene: ArtScene, seed: number): ReactNode {
  const rng = createRng(seed ^ 0x51ed);
  const cloud = (x: number, y: number, s: number) => (
    <g key={`${x}${y}`} fill="#ffffff" opacity="0.9" transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="0" cy="0" rx="9" ry="4" />
      <ellipse cx="6" cy="-3" rx="6" ry="4" />
      <ellipse cx="-6" cy="-2" rx="5" ry="3" />
    </g>
  );
  const clouds = [cloud(14 + rng() * 14, 12 + rng() * 8, 0.9 + rng() * 0.5), cloud(60 + rng() * 22, 20 + rng() * 10, 0.7 + rng() * 0.5)];
  switch (scene) {
    case "street":
      return (
        <g>
          <rect width="100" height="100" fill="#cfe1f2" />
          <rect x="0" y="22" width="22" height="50" fill="#9aa5b8" />
          <rect x="78" y="14" width="22" height="58" fill="#8794ab" />
          {[30, 40, 52].map((y) => (
            <rect key={y} x="5" y={y} width="5" height="5" fill="#dfe9f7" />
          ))}
          <rect x="0" y="70" width="100" height="30" fill="#6b7280" />
          <rect x="0" y="68" width="100" height="3" fill="#a9b0bb" />
          {[8, 38, 68].map((x) => (
            <rect key={x} x={x} y="86" width="14" height="2.4" fill="#f5f5f5" opacity="0.85" />
          ))}
        </g>
      );
    case "water":
      return (
        <g>
          <rect width="100" height="100" fill="#cde8fb" />
          {clouds}
          <rect x="0" y="58" width="100" height="42" fill="#4f9fda" />
          {[66, 76, 88].map((y, i) => (
            <path key={y} d={`M${4 + i * 9} ${y} q6 -3 12 0 t12 0 t12 0 t12 0 t12 0 t12 0`} stroke="#ffffff" strokeWidth="1.2" fill="none" opacity="0.7" />
          ))}
        </g>
      );
    case "sky":
      return (
        <g>
          <rect width="100" height="100" fill="#8cc6f5" />
          <rect y="55" width="100" height="45" fill="#bfe0fa" />
          {clouds}
          {cloud(30 + rng() * 40, 80, 1.2)}
        </g>
      );
    case "yard":
      return (
        <g>
          <rect width="100" height="100" fill="#d6ecff" />
          {clouds}
          <rect x="0" y="62" width="100" height="38" fill="#6fb36b" />
          {[6, 22, 38, 54, 70, 86].map((x) => (
            <rect key={x} x={x} y="44" width="9" height="30" rx="2" fill="#e8dcc0" />
          ))}
          <rect x="0" y="52" width="100" height="4" fill="#d9ccae" />
        </g>
      );
    case "park":
    default:
      return (
        <g>
          <rect width="100" height="100" fill="#bfe3ff" />
          <circle cx={78 + rng() * 10} cy="14" r="7" fill="#fff0a8" />
          {clouds}
          <rect x="0" y="62" width="100" height="38" fill="#79c070" />
          {Array.from({ length: 8 }, (_, i) => (
            <path key={i} d={`M${6 + i * 12 + rng() * 4} 90 l1.5 -6 l1.5 6`} stroke="#4f9a4a" strokeWidth="1.2" fill="none" />
          ))}
        </g>
      );
  }
}

export function sceneFor(category: ArtCategory, rng: () => number): ArtScene {
  const options = ART_SCENES_FOR[category];
  return options[Math.floor(rng() * options.length)] as ArtScene;
}

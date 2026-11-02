"use client";

import { useId, type MutableRefObject } from "react";
import { createRng } from "@captchalab/captcha-core";
import { ART_CATEGORIES, type ArtCategory, type SliderPuzzle } from "@captchalab/captcha-plugins";
import { drawObject, drawScene, inkFor } from "./draw";

/** Picture size in its own units, and the piece size. The piece travels W - PW units; the gap is where it fits. */
export const PUZZLE_W = 220;
export const PUZZLE_H = 100;
export const PIECE = 28;
/** A square with a round knob on top: the usual outline of a puzzle piece. Drawn at (0, 0), height PIECE. */
const SHAPE = `M0 6 H10 a4 4 0 1 1 8 0 H${PIECE} V${PIECE} H0 Z`;

/** Horizontal move of the piece, in picture units, for a handle position (0..1) and the target (0..1). */
export const pieceShift = (position: number, target: number): number => (position - target) * (PUZZLE_W - PIECE);

interface Props {
  puzzle: SliderPuzzle;
  /** Normalized target of the slider: where the gap is. Only used to draw; the verifier decides correctness. */
  target: number;
  /** The surface moves the piece through this ref (no React state per pointer move). */
  pieceRef: MutableRefObject<SVGGElement | null>;
  className?: string;
}

/**
 * The picture of the puzzle slider: CaptchaLab's own scene, a gap cut out of it and a piece (a copy of exactly what the
 * gap hides) that the slider handle pushes along. It is decorative (aria-hidden); the handle below carries the
 * accessible name and value. Nothing is downloaded: the scene is drawn from (category, seed).
 */
export function PuzzlePicture({ puzzle, target, pieceRef, className }: Props) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const rng = createRng(puzzle.seed ^ 0x77aa);
  const slotX = target * (PUZZLE_W - PIECE);
  const slotY = puzzle.y * (PUZZLE_H - PIECE - 4) + 2;
  const others = ART_CATEGORIES.filter((c) => c !== puzzle.category);
  const side = (k: number): ArtCategory => others[Math.floor(createRng(puzzle.seed + k)() * others.length)] as ArtCategory;
  // The main object sits around the gap so the gap hides something recognisable; two smaller objects fill the sides.
  const mainX = Math.min(PUZZLE_W - 40, Math.max(40, slotX + PIECE / 2 + (rng() - 0.5) * 24));
  const leftX = mainX > PUZZLE_W / 2 ? 34 : PUZZLE_W - 34;
  const place = (x: number, scale: number) => `translate(${x - 50 * scale} ${PUZZLE_H * 0.62 - 50 * scale}) scale(${scale})`;
  const picture = (
    <g id={`pic${uid}`}>
      <g transform="scale(1.1 1)">{drawScene(puzzle.scene, puzzle.seed)}</g>
      <g transform={`translate(${PUZZLE_W / 2} 0) scale(1.1 1)`}>{drawScene(puzzle.scene, puzzle.seed + 1)}</g>
      <g transform={place(leftX, 0.5)} opacity="0.95">
        {drawObject(side(1), inkFor(puzzle.seed + 3))}
      </g>
      <g transform={place(mainX, 0.78)}>{drawObject(puzzle.category, inkFor(puzzle.seed))}</g>
    </g>
  );
  const at = `translate(${slotX} ${slotY})`;
  return (
    <svg viewBox={`0 0 ${PUZZLE_W} ${PUZZLE_H}`} aria-hidden="true" focusable="false" data-testid="puzzle-picture" className={className}>
      <defs>
        <clipPath id={`clip${uid}`}>
          <path d={SHAPE} transform={at} />
        </clipPath>
      </defs>
      {picture}
      {/* The gap: the same outline, darkened. */}
      <path d={SHAPE} transform={at} fill="rgba(10, 14, 28, 0.55)" stroke="#ffffff" strokeWidth="1" strokeDasharray="3 2" />
      {/* The piece starts at the left (position 0) and is moved by the surface. */}
      <g ref={pieceRef} data-testid="puzzle-piece" transform={`translate(${pieceShift(0, target)} 0)`}>
        <g clipPath={`url(#clip${uid})`}>
          <use href={`#pic${uid}`} />
        </g>
        <path d={SHAPE} transform={at} fill="none" stroke="#ffffff" strokeWidth="1.4" />
        <path d={SHAPE} transform={at} fill="none" stroke="rgba(10, 14, 28, 0.35)" strokeWidth="0.6" />
      </g>
    </svg>
  );
}

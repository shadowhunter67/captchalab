"use client";

import { useCallback } from "react";
import type {
  CheckboxChallenge,
  DragDropChallenge,
  AudioChallenge,
  ImageGridChallenge,
  MathChallenge,
  MemoryChallenge,
  RotationChallenge,
  SequenceChallenge,
  ShapeMatchingChallenge,
  SliderChallenge,
  TextChallenge,
} from "@captchalab/captcha-plugins";
import type { SessionReport } from "@/lib/behavior/human";
import type { BehaviorCaptchaId } from "@/lib/behavior/types";
import { CheckboxSession } from "@/features/checkbox/CheckboxSession";
import { DragDropSession } from "@/features/drag-drop/DragDropSession";
import { ImageGridSession } from "@/features/image-grid/ImageGridSession";
import { RotationSession } from "@/features/rotation/RotationSession";
import { SliderSession, type SliderResult } from "@/features/slider/SliderSession";
import { TextSession } from "@/features/text/TextSession";
import { AudioSession } from "@/features/audio/AudioSession";
import { MathSession } from "@/features/math-logic/MathSession";
import { MemorySession } from "@/features/memory/MemorySession";
import { SequenceSession } from "@/features/sequence/SequenceSession";
import { ShapeMatchingSession } from "@/features/shape-matching/ShapeMatchingSession";

interface Props {
  captchaId: BehaviorCaptchaId;
  /** The challenge object made by the CAPTCHA's own generator. */
  challenge: unknown;
  onNewChallenge: () => void;
  onResult: (report: SessionReport) => void;
  onReset: () => void;
}

/**
 * The CAPTCHA's own playground session, with its Inspect panel hidden, reporting each analyzed attempt to the
 * lab. Nothing is stored: the report lives in React state of the Compare page only.
 */
export function HumanTask({ captchaId, challenge, onNewChallenge, onResult, onReset }: Props) {
  const onSlider = useCallback((r: SliderResult) => onResult({ session: r.session, context: r.layout, passed: r.verification.passed }), [onResult]);
  const common = { onNewChallenge, onResult, onReset, showInspect: false } as const;
  switch (captchaId) {
    case "slider":
      return <SliderSession challenge={challenge as SliderChallenge} onNewChallenge={onNewChallenge} onResult={onSlider} onReset={onReset} showInspect={false} />;
    case "drag-drop":
      return <DragDropSession challenge={challenge as DragDropChallenge} {...common} />;
    case "checkbox":
      return <CheckboxSession challenge={challenge as CheckboxChallenge} {...common} />;
    case "image-grid":
      return <ImageGridSession challenge={challenge as ImageGridChallenge} {...common} />;
    case "text":
      return <TextSession challenge={challenge as TextChallenge} {...common} />;
    case "rotation":
      return <RotationSession challenge={challenge as RotationChallenge} {...common} />;
    case "shape-matching":
      return <ShapeMatchingSession challenge={challenge as ShapeMatchingChallenge} {...common} />;
    case "math-logic":
      return <MathSession challenge={challenge as MathChallenge} {...common} />;
    case "sequence":
      return <SequenceSession challenge={challenge as SequenceChallenge} {...common} />;
    case "memory":
      return <MemorySession challenge={challenge as MemoryChallenge} {...common} />;
    case "audio":
      return <AudioSession challenge={challenge as AudioChallenge} {...common} />;
  }
}

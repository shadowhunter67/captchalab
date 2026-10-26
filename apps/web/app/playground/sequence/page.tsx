import type { Metadata } from "next";
import { SequencePlayground } from "@/features/sequence/SequencePlayground";

export const metadata: Metadata = { title: "Sequence · CaptchaLab" };

export default function SequencePage() {
  return <SequencePlayground />;
}

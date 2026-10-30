import type { Metadata } from "next";
import { PosPlayground } from "@/features/proof-of-space/PosPlayground";

export const metadata: Metadata = { title: "Proof of Space · CaptchaLab" };

export default function ProofOfSpacePage() {
  return <PosPlayground />;
}

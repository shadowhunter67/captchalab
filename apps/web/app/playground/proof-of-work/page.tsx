import type { Metadata } from "next";
import { PowPlayground } from "@/features/proof-of-work/PowPlayground";

export const metadata: Metadata = { title: "Proof of Work · CaptchaLab" };

export default function ProofOfWorkPage() {
  return <PowPlayground />;
}

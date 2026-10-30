import type { Metadata } from "next";
import { HybridLab } from "@/features/hybrid/HybridLab";

export const metadata: Metadata = { title: "Hybrid challenge · CaptchaLab" };

export default function HybridPage() {
  return <HybridLab />;
}

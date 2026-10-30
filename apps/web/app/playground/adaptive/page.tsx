import type { Metadata } from "next";
import { AdaptiveLab } from "@/features/adaptive/AdaptiveLab";

export const metadata: Metadata = { title: "Adaptive Lab · CaptchaLab" };

export default function AdaptivePage() {
  return <AdaptiveLab />;
}

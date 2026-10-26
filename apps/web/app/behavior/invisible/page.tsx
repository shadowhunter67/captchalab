import type { Metadata } from "next";
import { InvisibleLab } from "@/features/behavior/InvisibleLab";

export const metadata: Metadata = { title: "Behavioral demo · CaptchaLab" };

export default function InvisiblePage() {
  return <InvisibleLab />;
}

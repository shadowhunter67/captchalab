import type { Metadata } from "next";
import { MathPlayground } from "@/features/math-logic/MathPlayground";

export const metadata: Metadata = { title: "Math / Logic · CaptchaLab" };

export default function MathLogicPage() {
  return <MathPlayground />;
}

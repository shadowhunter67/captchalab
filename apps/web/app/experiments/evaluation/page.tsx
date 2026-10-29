import type { Metadata } from "next";
import { EvaluationPage } from "@/features/evaluation/EvaluationPage";

export const metadata: Metadata = { title: "Classifier evaluation · CaptchaLab" };

export default function Page() {
  return <EvaluationPage />;
}

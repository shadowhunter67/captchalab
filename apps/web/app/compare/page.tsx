import type { Metadata } from "next";
import { ComparePlayground } from "@/features/compare/ComparePlayground";

export const metadata: Metadata = { title: "Compare · CaptchaLab" };

export default function ComparePage() {
  return <ComparePlayground />;
}

import type { Metadata } from "next";
import { LearnIndex } from "@/features/index-pages/LearnIndex";

export const metadata: Metadata = { title: "Learn · CaptchaLab" };

export default function LearnIndexPage() {
  return <LearnIndex />;
}

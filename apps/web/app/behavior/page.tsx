import type { Metadata } from "next";
import { BehaviorHome } from "@/features/behavior/BehaviorHome";

export const metadata: Metadata = { title: "Behavioral Lab · CaptchaLab" };

export default function BehaviorPage() {
  return <BehaviorHome />;
}

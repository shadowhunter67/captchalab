import type { Metadata } from "next";
import { InvisibleLab } from "@/features/behavior/InvisibleLab";

export const metadata: Metadata = { title: "Invisible Lab · CaptchaLab" };

export default function InvisibleLabPage() {
  return <InvisibleLab />;
}

import type { Metadata } from "next";
import { TextPlayground } from "@/features/text/TextPlayground";

export const metadata: Metadata = { title: "Text · CaptchaLab" };

export default function TextPage() {
  return <TextPlayground />;
}

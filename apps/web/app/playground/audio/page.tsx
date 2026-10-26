import type { Metadata } from "next";
import { AudioPlayground } from "@/features/audio/AudioPlayground";

export const metadata: Metadata = { title: "Audio · CaptchaLab" };

export default function AudioPage() {
  return <AudioPlayground />;
}

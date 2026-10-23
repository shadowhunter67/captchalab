import type { Metadata } from "next";
import { PlaygroundIndex } from "@/features/index-pages/PlaygroundIndex";

export const metadata: Metadata = { title: "Playground · CaptchaLab" };

export default function PlaygroundIndexPage() {
  return <PlaygroundIndex />;
}

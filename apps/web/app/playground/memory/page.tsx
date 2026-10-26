import type { Metadata } from "next";
import { MemoryPlayground } from "@/features/memory/MemoryPlayground";

export const metadata: Metadata = { title: "Memory · CaptchaLab" };

export default function MemoryPage() {
  return <MemoryPlayground />;
}

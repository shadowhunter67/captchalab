import type { Metadata } from "next";
import { BcPlayground } from "@/features/browser-capability/BcPlayground";

export const metadata: Metadata = { title: "Browser Capability · CaptchaLab" };

export default function BrowserCapabilityPage() {
  return <BcPlayground />;
}

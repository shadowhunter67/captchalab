import type { Metadata } from "next";
import { MatchKeyPlayground } from "@/features/match-key/MatchKeyPlayground";

export const metadata: Metadata = { title: "MatchKey · CaptchaLab" };

export default function MatchKeyPage() {
  return <MatchKeyPlayground />;
}

import type { Metadata } from "next";
import { BuilderPage } from "@/features/builder/BuilderPage";

export const metadata: Metadata = { title: "Challenge builder · CaptchaLab" };

export default function Page() {
  return <BuilderPage />;
}

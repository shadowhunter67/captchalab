import type { Metadata } from "next";
import { ExperimentWorkspace } from "@/features/experiments/ExperimentWorkspace";

export const metadata: Metadata = { title: "Experiments · CaptchaLab" };

export default function Page() {
  return <ExperimentWorkspace />;
}

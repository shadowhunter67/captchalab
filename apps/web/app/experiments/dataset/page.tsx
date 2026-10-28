import type { Metadata } from "next";
import { DatasetPage } from "@/features/dataset/DatasetPage";

export const metadata: Metadata = { title: "Labeled dataset · CaptchaLab" };

export default function Page() {
  return <DatasetPage />;
}

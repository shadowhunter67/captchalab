import type { Metadata } from "next";
import { CheckboxPlayground } from "@/features/checkbox/CheckboxPlayground";

export const metadata: Metadata = { title: "Checkbox · CaptchaLab" };

export default function CheckboxPage() {
  return <CheckboxPlayground />;
}

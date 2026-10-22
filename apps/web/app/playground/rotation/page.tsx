import type { Metadata } from "next";
import { RotationPlayground } from "@/features/rotation/RotationPlayground";

export const metadata: Metadata = { title: "Image Rotation · CaptchaLab" };

export default function RotationPage() {
  return <RotationPlayground />;
}

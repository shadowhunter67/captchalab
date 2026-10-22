import type { Metadata } from "next";
import { SliderPlayground } from "@/features/slider/SliderPlayground";

export const metadata: Metadata = { title: "Slider · CaptchaLab" };

export default function SliderPage() {
  return <SliderPlayground />;
}

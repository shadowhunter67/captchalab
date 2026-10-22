import type { Metadata } from "next";
import { ImageGridPlayground } from "@/features/image-grid/ImageGridPlayground";

export const metadata: Metadata = { title: "Image Grid · CaptchaLab" };

export default function ImageGridPage() {
  return <ImageGridPlayground />;
}

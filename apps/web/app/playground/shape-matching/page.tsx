import type { Metadata } from "next";
import { ShapeMatchingPlayground } from "@/features/shape-matching/ShapeMatchingPlayground";

export const metadata: Metadata = { title: "Shape Matching · CaptchaLab" };

export default function ShapeMatchingPage() {
  return <ShapeMatchingPlayground />;
}

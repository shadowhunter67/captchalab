import type { Metadata } from "next";
import { DragDropPlayground } from "@/features/drag-drop/DragDropPlayground";

export const metadata: Metadata = { title: "Drag & Drop · CaptchaLab" };

export default function DragDropPage() {
  return <DragDropPlayground />;
}

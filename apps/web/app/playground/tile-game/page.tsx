import type { Metadata } from "next";
import { TileGamePlayground } from "@/features/tile-game/TileGamePlayground";

export const metadata: Metadata = { title: "Tile Game · CaptchaLab" };

export default function TileGamePage() {
  return <TileGamePlayground />;
}

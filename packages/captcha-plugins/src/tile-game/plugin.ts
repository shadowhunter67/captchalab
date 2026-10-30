import { defineCaptchaPlugin } from "@captchalab/captcha-core";
import { extractTileGameFeatures } from "./feature-extractor";
import { generateTileGameChallenge } from "./generator";
import { TILE_GAME_ID, type TileGameAnswer, type TileGameChallenge, type TileGameFeatures } from "./types";
import { verifyTileGameAnswer } from "./verifier";

export const tileGamePlugin = defineCaptchaPlugin<typeof TILE_GAME_ID, TileGameChallenge, TileGameAnswer, TileGameFeatures>({
  id: TILE_GAME_ID,
  name: "Tile Game",
  version: "1.0.0",
  generate: generateTileGameChallenge,
  verify: (challenge, answer) => verifyTileGameAnswer(challenge, answer),
  extractFeatures: (challenge, interaction) => extractTileGameFeatures(challenge, interaction),
});

/**
 * URL of a file in apps/web/public, correct both at "/" (dev, tests) and under the GitHub Pages base path
 * ("/captchalab"): `assetUrl("audio/digits/4.wav")`. next.config.ts sets NEXT_PUBLIC_BASE_PATH at build time.
 */
export function assetUrl(path: string, basePath: string = process.env.NEXT_PUBLIC_BASE_PATH ?? ""): string {
  const base = basePath.replace(/\/+$/, "");
  return `${base}/${path.replace(/^\/+/, "")}`;
}

# Assets and provenance

CaptchaLab's pictures are **drawn by code**. There is no image file, no photo, no downloaded pack and no third-party
asset in the repository, and nothing is fetched at runtime.

| Where | What it draws | Provenance |
|---|---|---|
| `apps/web/lib/art/draw.tsx` | 14 flat vector illustrations (bicycle, bus, car, boat, airplane, cat, dog, bird, tree, flower, traffic light, house, umbrella, chair) and five scene backgrounds (park, street, water, sky, yard) | Original work of this project: SVG primitives written for CaptchaLab. Not traced from, copied from or derived from any photograph, icon set, stock image or provider. |
| `apps/web/lib/art/ArtTile.tsx`, `PuzzlePicture.tsx` | A tile (object on a scene, with small background objects) and the puzzle slider's picture with its gap and piece | Original, same as above. |
| `packages/captcha-plugins/src/shared/art.ts` | The catalog: category ids, tags (habitat, look-alike group), the scenes where each object looks natural | Data only. |
| `apps/web/public/audio/digits/*.wav` | The ten spoken digits of the Audio challenge | Rendered locally with the Windows built-in speech synthesizer (SAPI, the "Zira" voice), one clip per digit; no recording of a person. Kept as local static files, never fetched from elsewhere. |

## How a picture is chosen

A challenge stores only a **category and a seed** (never a picture). The same seed, variant and difficulty therefore give
the same challenge, down to the drawing: the colour of a bus, the position of a small background object, the mirror flip.
The catalog also groups look-alikes (vehicles, animals, plants, street objects, things): the hard level draws most of its
distractors from the target's own group, and the object variants of Drag & Drop, Shape Matching, MatchKey and Tile Game
never put two objects of one group on the same board, so two pictures are never confusable.

## What was deliberately not done

- No provider's artwork, layout, wording, interaction protocol or hidden scoring is reproduced. The challenges are generic
  approximations of a family (select the pictures with an object, slide a piece into a gap, read distorted text, turn a
  picture upright...), not clones of a product.
- No logos, brand marks, copyrighted characters or screenshots.
- No runtime image fetch. A test fails if a challenge page requests anything outside its own origin.

## Adding a picture

Add the category to `ART_CATEGORIES` (and its habitat, group and natural scenes), draw it in `draw.tsx` in a 100x100 box with
`k.sil ?? colour` for every fill (so the silhouette variants work), and give it a name in `lib/art/names.ts`. Keep it original.

# Realism pass (v1.1)

Goal: every challenge looks, feels and is operated like the family of real CAPTCHA it stands for, while staying **generic,
deterministic, local-only and non-proprietary**. This page is the audit that started the pass and the checklist it ended on.
It is not a claim of equivalence with any provider: nothing here copies a provider's layout, wording, assets, protocol or
scoring (see [assets](assets.md)).

## The four tests every challenge has to pass

1. **Recognizable**: someone who has met the real thing knows the family at a glance.
2. **Realistic interaction**: it is operated the way the family usually is.
3. **Deterministic**: the same seed, variant and difficulty give the same challenge (pictures included).
4. **Generic**: it resembles a family, not a product.

And four invariants: local assets only, privacy unchanged, accessibility preserved (an answer is never in an accessible
name), and the classifier, the dataset format and the evaluation maths unchanged.

## Audit before the pass

| Challenge | Visual | Interaction | Main gap | Rating |
|---|---|---|---|---|
| Image Grid | White shapes on dark tiles | Right (select, verify) | Looked like a shape quiz, not a picture grid; tile names gave the answer | Needs redesign |
| Slider | A handle and a dashed outline | Right | A bar, not a puzzle | Needs redesign |
| Text | Plain rotated letters | Right | One font, one colour, few noise lines | Needs polish |
| Rotation | An arrow in a circle | Right | An arrow, not a picture to turn upright | Needs redesign |
| Drag & Drop | Circle, square, triangle | Right | Abstract shapes | Needs redesign |
| Shape Matching | Plain shapes | Right | Abstract shapes | Needs redesign |
| MatchKey | Shape, pattern, orientation glyphs | Right | Abstract glyphs | Needs redesign |
| Tile Game | The same glyphs | Right | Abstract glyphs | Needs redesign |
| Checkbox | A native box in a dark card | Right | A lab control | Needs polish |
| Math / Logic, Sequence | Prompt text and shapes | Right | Lab chrome around the prompt | Needs polish |
| Memory | Start, hide, recall | Right | No reveal feel | Needs polish |
| Audio | A plain Play button | Right | No icon, one voice | Needs polish |
| Proof of Work / Space | Hash text and counters | Right | A benchmark page, not a system check | Needs redesign |
| Browser Capability | A button and a list | Right | No "required capabilities available" outcome | Needs polish |
| Hybrid | Two stacked cards | Right | No sense of two steps | Needs polish |
| Invisible, Adaptive | Lab pages | Right | Wording of the real flow | Needs polish |

## What changed

- **A common widget skin.** Every challenge's "Try" card is a light, calm card with a prompt and one primary action; the
  results, Inspect and the other lab panels stay outside it in the dark console theme, so the challenge looks like a
  challenge and the lab like a lab.
- **A drawn catalog** of 14 objects and 5 scenes ([assets](assets.md)), used by:
  - **Image Grid**: *Picture categories* and *Scene objects* (a main object and small background objects; a tile that is not an
    answer never shows the target, not even in the background). Tile names are only "Image N of 9"; an alternative challenge is linked.
  - **Slider**: *Puzzle piece* (a scene with a gap and a piece that follows the handle).
  - **Rotation**: *Upright picture* (a round picture to turn the right way up).
  - **Drag & Drop** and **Shape Matching**: *Objects and silhouettes*.
  - **MatchKey** and **Tile Game**: *object* variants (the same board rules, dressed as objects, colourways and turns).
  - The Playground opens each of these with its realistic variant; the plain variants are one choice away, and an address that
    names a variant always gets exactly that variant.
- **Text**: a different font, ink, size and slant for every character, a speckled paper, curves and lines across, a mild wave;
  strength follows the challenge's own parameters and stays readable.
- **System checks** (Proof of Work, Proof of Space, Browser Capability): a status line (working, then verified) and a summary
  such as "Required capabilities available"; hashes, byte counts and the like moved into a collapsed *Technical details*.
- **Hybrid**: a two-step indicator. **Invisible** and **Adaptive**: the real flow's wording ("Start observation", "Suggested next
  challenge", still labelled experimental). **Checkbox** and **Audio**: a card with a check mark, a speaker icon.

## Checklist (answered per challenge in the Learn page and the coverage matrix)

Looks like the family; operated like the family; still generic; deterministic; local assets only; independent verifier;
accessibility preserved; privacy preserved. "Partial" in the matrix means a part is simplified (said in the Learn section).

## Deliberately not done

4x4 grids and refreshing tiles, photographs, extra voices, Memory replay, provider-specific mimicry, and any change to the
classifier, the dataset format or the evaluation maths. Every picture variant works with the keyboard, but a person who cannot see the pictures cannot do it (the answer is never put in
an accessible name). The plain variants (whose names say what they show) and the audio challenge remain for that, and the pages say so.

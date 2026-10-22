/**
 * The six CaptchaLab challenges as data for the /playground and /learn index pages. Short, factual and
 * consistent with each playground's own Learn section. Nothing here claims to describe a commercial system.
 */

export interface CatalogEntry {
  id: "slider" | "checkbox" | "drag-drop" | "rotation" | "text" | "image-grid";
  name: string;
  route: string;
  summary: string;
  learn: {
    howItWorks: string;
    generation: string;
    verification: string;
    signals: readonly string[];
    strengths: readonly string[];
    weaknesses: readonly string[];
    accessibility: string;
    automation: string;
  };
}

const AUTOMATION_NOTE =
  "CaptchaLab studies only its own lab challenge and does not integrate with or automate any third-party service.";

export const CATALOG: readonly CatalogEntry[] = [
  {
    id: "slider",
    name: "Slider",
    route: "/playground/slider",
    summary: "Drag a handle to a target position.",
    learn: {
      howItWorks: "You drag a handle along a track until it lands on a dashed outline, then release.",
      generation: "A seeded generator picks a target position between 25% and 90% of the handle's travel.",
      verification: "Correctness only: the release position must be within 2% of travel of the target. The way you dragged never affects pass or fail.",
      signals: [
        "Drag duration, release error and overshoot past the target.",
        "Speed, acceleration and direction changes along the path.",
        "Number of attempts and the approach before the press.",
      ],
      strengths: ["Fast and intuitive with a mouse or finger.", "Produces a rich, continuous trajectory to study."],
      weaknesses: ["A path is easy for software to generate.", "Hard for people with motor impairments without a keyboard path."],
      accessibility: "Arrow keys move the handle and Enter submits, but screen-reader support is limited: the target is conveyed visually.",
      automation: `A straight or smoothed path is trivial to synthesize, which is what the Compare page shows. ${AUTOMATION_NOTE}`,
    },
  },
  {
    id: "checkbox",
    name: "Checkbox",
    route: "/playground/checkbox",
    summary: "Activate a native checkbox.",
    learn: {
      howItWorks: "You activate a checkbox with a pointer or the Space key. Checking it submits the challenge.",
      generation: "There is nothing to generate beyond the expected state (checked).",
      verification: "Correctness only: the answer must be checked. Behavior never decides the verdict.",
      signals: ["Reaction time and time to the first press.", "Press duration and pointer position.", "Input modality and approach motion."],
      strengths: ["Almost no effort for people.", "Natively accessible."],
      weaknesses: ["The challenge itself proves nothing; any value comes from the interaction signals around it."],
      accessibility: "A native checkbox with a label: keyboard operable and announced by assistive technology.",
      automation: `Trivial to click programmatically. ${AUTOMATION_NOTE}`,
    },
  },
  {
    id: "drag-drop",
    name: "Drag & Drop",
    route: "/playground/drag-drop",
    summary: "Place several items on matching targets.",
    learn: {
      howItWorks: "You drag each item onto its matching target. Dropping on an occupied target sends the occupant back to its start.",
      generation: "A seeded generator picks items and shuffled targets so the same seed gives the same layout.",
      verification: "Correctness only: every item must be on its own target. Dragging style never affects the verdict.",
      signals: ["Per-drag duration, release error and overshoot.", "Number of attempts and re-drags.", "Speed, acceleration and direction changes."],
      strengths: ["Many drags give a richer picture than one.", "Intuitive."],
      weaknesses: ["Needs fine pointer control.", "No keyboard alternative in this demo."],
      accessibility: "Not usable by keyboard-only users in this demo; this limitation is documented on the page.",
      automation: `Drags can be synthesized from the target geometry. ${AUTOMATION_NOTE}`,
    },
  },
  {
    id: "rotation",
    name: "Image Rotation",
    route: "/playground/rotation",
    summary: "Turn an object upright.",
    learn: {
      howItWorks: "You turn an object by dragging around its centre or with the arrow keys until it is upright, then verify.",
      generation: "A seeded generator picks a starting angle away from upright.",
      verification: "Correctness only: the final angle must be within a tolerance of upright.",
      signals: ["Angular distance and angular velocity.", "Drag count and cancelled drags.", "Keyboard steps and bursts."],
      strengths: ["Needs a spatial judgment, not just a click."],
      weaknesses: ["Symmetric objects are ambiguous.", "Software can compute the needed angle."],
      accessibility: "Arrow keys turn in 5-degree steps and the control is exposed as a slider with its value.",
      automation: `The target angle is known to the page, so software can compute the turn. ${AUTOMATION_NOTE}`,
    },
  },
  {
    id: "text",
    name: "Text",
    route: "/playground/text",
    summary: "Read distorted characters and type them.",
    learn: {
      howItWorks: "You read a short distorted string and type it.",
      generation: "A seeded generator picks six characters without look-alikes, rotates and shifts each and adds noise lines.",
      verification: "Correctness only: the typed text, trimmed and compared case-insensitively, must equal the string.",
      signals: ["Time to first character and total time.", "Rhythm between characters and corrections.", "The recording stores key classes, never which letter."],
      strengths: ["Familiar and cheap."],
      weaknesses: ["Modern OCR reads simple distorted text well.", "Hard to read for many people."],
      accessibility: "The field is labelled and keyboard operable, but the task needs sight and this demo has no text or audio alternative.",
      automation: `The characters are plain SVG text in this demo, trivial for software to read. ${AUTOMATION_NOTE}`,
    },
  },
  {
    id: "image-grid",
    name: "Image Grid",
    route: "/playground/image-grid",
    summary: "Select every tile that shows a named shape.",
    learn: {
      howItWorks: "You see nine images and select every one that matches a named shape, then verify.",
      generation: "A seeded generator places the target shape in two to four of nine cells and fills the rest with other shapes, drawn as simple SVG.",
      verification: "Correctness only: the selected cells must be exactly the matching cells, none missing and none extra.",
      signals: ["Reaction time, time to first selection and total time.", "Time between toggles and deselections.", "Rounds of selecting and input modality."],
      strengths: ["Quick for people.", "The verifier is a simple set comparison."],
      weaknesses: ["Image classification by software is strong.", "Ambiguous images frustrate people."],
      accessibility: "Each tile is a labelled toggle button with arrow-key navigation; its label names the shape.",
      automation: `Because labels name the shape, this demo is trivial for software. ${AUTOMATION_NOTE}`,
    },
  },
];

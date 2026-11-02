"use client";

import { CaptchaLearn } from "@/components/CaptchaLearn";
import { LabLearnCard, RealismBlock } from "@/components/LearnCards";
import { useT } from "@/lib/i18n";
import { taxonomyFor, type LabId, type PluginId, type TaxonomyId } from "@/lib/taxonomy";
import { BehavioralLearn } from "@/features/index-pages/BehavioralLearn";
import { CheckboxLearn } from "@/features/checkbox/CheckboxLearn";
import { DragDropLearn } from "@/features/drag-drop/DragDropLearn";
import { ImageGridLearn } from "@/features/image-grid/ImageGridLearn";
import { SliderLearn } from "@/features/slider/SliderLearn";
import { RotationLearn } from "@/features/rotation/RotationLearn";
import { TextLearn } from "@/features/text/TextLearn";

/** Challenges whose playground used to carry its own Learn block; the same component is shown here. */
const OWN_LEARN: Partial<Record<PluginId, () => React.JSX.Element | null>> = {
  text: TextLearn,
  rotation: RotationLearn,
  "image-grid": ImageGridLearn,
  "drag-drop": DragDropLearn,
  checkbox: CheckboxLearn,
  slider: SliderLearn,
};

const LABS: readonly string[] = ["hybrid-pow-visual", "hybrid-pow-audio", "invisible", "adaptive"];

/**
 * The content of the "Learn" tab of the workspace. It is the text that used to sit under the challenge, moved here without
 * being rewritten: the per-challenge Learn block (or the catalog entry) and how the challenge resembles the real thing.
 */
export function LearnPanel({ id }: { id: string }) {
  const t = useT();
  const taxonomy = taxonomyFor(t);
  const entry = taxonomy.find((e) => e.id === (id as TaxonomyId));
  if (id === "behavior") return <div className="cl-learn-cols"><BehavioralLearn /></div>;
  if (!entry) {
    return (
      <p className="text-sm text-muted" data-testid="learn-empty">
        {t("Đây là công cụ nghiên cứu, không phải một thử thách. Mô tả của từng thử thách nằm ở mục Tìm hiểu bên trái.", "This is a research tool, not a challenge. The description of each challenge is under Learn on the left.")}
      </p>
    );
  }
  if (LABS.includes(id)) {
    return (
      <div className="cl-learn-cols">
        <LabLearnCard id={id as LabId} name={entry.name} />
      </div>
    );
  }
  const Own = OWN_LEARN[id as PluginId];
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-line bg-panel p-4 text-sm">
        <RealismBlock id={id as PluginId} />
      </div>
      <div className="cl-learn-cols">{Own ? <Own /> : <CaptchaLearn id={id as PluginId} />}</div>
    </div>
  );
}

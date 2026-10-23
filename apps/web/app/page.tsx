"use client";

import { useEffect, useState } from "react";
import { useLang, useT } from "@/lib/i18n";

interface Item {
  id: string;
  name: [vi: string, en: string];
  hint: [vi: string, en: string];
  /** Relative on purpose: it works at "/" in dev and under "/captchalab/" on GitHub Pages. */
  path: string;
}

const CHALLENGES: readonly Item[] = [
  { id: "slider", name: ["Thanh trượt", "Slider"], hint: ["Kéo thanh trượt tới đích", "Drag a handle to a target"], path: "playground/slider/" },
  { id: "checkbox", name: ["Ô đánh dấu", "Checkbox"], hint: ["Đánh dấu vào ô", "Tick a checkbox"], path: "playground/checkbox/" },
  { id: "drag-drop", name: ["Kéo thả", "Drag & Drop"], hint: ["Thả hình vào đúng vị trí", "Drop shapes on matching spots"], path: "playground/drag-drop/" },
  { id: "rotation", name: ["Xoay ảnh", "Image Rotation"], hint: ["Xoay vật cho thẳng đứng", "Turn an object upright"], path: "playground/rotation/" },
  { id: "text", name: ["Văn bản", "Text"], hint: ["Gõ lại các chữ bị méo", "Type the distorted letters"], path: "playground/text/" },
  { id: "image-grid", name: ["Lưới ảnh", "Image Grid"], hint: ["Chọn mọi ô có hình yêu cầu", "Pick all tiles with a shape"], path: "playground/image-grid/" },
];

const MORE: readonly Item[] = [
  { id: "compare", name: ["So sánh", "Compare"], hint: ["Thao tác của bạn và bản tạo sẵn", "Your drag vs a generated one"], path: "compare/" },
  { id: "learn", name: ["Tìm hiểu", "Learn"], hint: ["Mỗi thử thách hoạt động ra sao", "How each challenge works"], path: "learn/" },
];

const ALL = [...CHALLENGES, ...MORE];

function ItemButton({ item, active, onSelect }: { item: Item; active: boolean; onSelect: (id: string) => void }) {
  const t = useT();
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(item.id)}
        aria-current={active ? "page" : undefined}
        data-testid={`pick-${item.id}`}
        className={`w-full rounded-md border px-3 py-2 text-left text-sm ${
          active ? "border-accent bg-accent font-medium text-bg" : "border-line bg-panel hover:bg-track"
        }`}
      >
        <span className="block font-medium">{t(...item.name)}</span>
        <span className={`block text-xs ${active ? "opacity-90" : "text-muted"}`}>{t(...item.hint)}</span>
      </button>
    </li>
  );
}

export default function HomePage() {
  const t = useT();
  const { lang } = useLang();
  const [selected, setSelected] = useState("slider");

  // The choice lives in the URL hash so a link such as /#compare opens that page on the right.
  useEffect(() => {
    const fromHash = window.location.hash.slice(1);
    if (ALL.some((i) => i.id === fromHash)) setSelected(fromHash);
  }, []);

  const select = (id: string): void => {
    setSelected(id);
    window.history.replaceState(null, "", `#${id}`);
  };

  const current = ALL.find((i) => i.id === selected) ?? CHALLENGES[0]!;

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">CaptchaLab</h1>
        <p className="mt-1 text-sm text-muted">
          {t(
            "Khám phá. Tương tác. Thấu hiểu. Chọn một thử thách ở bên trái và thử ngay ở bên phải. Mọi thứ chạy trong trình duyệt của bạn; dữ liệu thao tác thô không được tải lên.",
            "Explore. Interact. Understand. Pick a challenge on the left and try it on the right. Everything runs in your browser; raw interaction data is not uploaded.",
          )}
        </p>
      </header>

      <div className="grid flex-1 gap-4 lg:grid-cols-[16rem_1fr]">
        <nav aria-label={t("Thử thách", "Challenges")} className="space-y-4">
          <div>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{t("Thử thách", "Challenges")}</h2>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-1">
              {CHALLENGES.map((i) => (
                <ItemButton key={i.id} item={i} active={i.id === selected} onSelect={select} />
              ))}
            </ul>
          </div>
          <div>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{t("Khác", "More")}</h2>
            <ul className="grid grid-cols-2 gap-2 lg:grid-cols-1">
              {MORE.map((i) => (
                <ItemButton key={i.id} item={i} active={i.id === selected} onSelect={select} />
              ))}
            </ul>
          </div>
        </nav>

        <section aria-label={t(...current.name)} className="flex min-h-0 min-w-0 flex-col rounded-lg border border-line bg-panel">
          <div className="flex items-center justify-between gap-3 border-b border-line px-3 py-2 text-sm">
            <span className="font-medium">{t(...current.name)}</span>
          </div>
          <iframe
            key={`${current.id}:${lang}`}
            src={`${current.path}?lang=${lang}&embed=1`}
            title={t(...current.name)}
            data-testid="preview"
            className="h-[75vh] min-h-[560px] w-full flex-1 rounded-b-lg bg-bg"
          />
        </section>
      </div>
    </main>
  );
}

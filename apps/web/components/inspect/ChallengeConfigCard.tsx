"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { ChallengeConfig } from "@captchalab/captcha-core";
import { VARIANT_SETS } from "@captchalab/captcha-plugins";
import { Card } from "@/components/inspect/Card";
import { catalogFor } from "@/lib/catalog";
import { useT } from "@/lib/i18n";
import { describeConfig, type CaptchaKey } from "@/lib/variants-ui";

interface Shown {
  captcha: CaptchaKey;
  config: ChallengeConfig | undefined;
}

const ConfigContext = createContext<Shown | null>(null);

/** A playground wraps its session in this so any Inspect inside can show the challenge's configuration. */
export function ChallengeConfigProvider({ captcha, config, children }: Shown & { children: ReactNode }) {
  return <ConfigContext.Provider value={{ captcha, config }}>{children}</ConfigContext.Provider>;
}

/** "Challenge configuration": how the challenge was generated. Kept apart from the behavioral metrics. */
export function ChallengeConfigCard({ captcha, config }: Shown) {
  const t = useT();
  if (!config) return null;
  const name = catalogFor(t).find((c) => c.id === captcha)?.name ?? captcha;
  const variants: readonly { id: string; name: string }[] = VARIANT_SETS[captcha].variants;
  const fallback = variants.find((v) => v.id === config.variantId)?.name ?? config.variantId;
  const rows = describeConfig(captcha, name, config, fallback, t);
  return (
    <Card id={`config-${captcha}-h`} title={t("Cấu hình thử thách", "Challenge configuration")}>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm" data-testid="challenge-config">
        {rows.map((r) => (
          <div key={r.id} className="contents">
            <dt className="text-muted">{r.label}</dt>
            <dd className="font-mono" data-testid={`config-${r.id}`}>
              {r.value}
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

/** Placed inside an Inspect component: shows the card for the challenge the playground provided (or nothing). */
export function ChallengeConfigSlot() {
  const shown = useContext(ConfigContext);
  return shown ? <ChallengeConfigCard captcha={shown.captcha} config={shown.config} /> : null;
}

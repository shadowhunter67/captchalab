import type { InteractionSession } from "@captchalab/captcha-core";
import type { BehaviorContext } from "./types";

/**
 * What a playground Session hands to the Behavioral Lab after a submission: the recorded session, the UI
 * geometry the extractors need, and whether the challenge was passed. The lab keeps it in memory only.
 */
export interface SessionReport {
  session: InteractionSession;
  context: BehaviorContext;
  passed: boolean;
}

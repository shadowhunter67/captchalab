import type { EventRecorder, Point } from "@captchalab/captcha-core";
import {
  allPlaced,
  buildAnswer,
  createInitialState,
  grabOffsetOf,
  heldCenterOf,
  isValidLayout,
  makeDragItemTarget,
  makeDropTarget,
  normalizedToPx,
  resolveDrop,
  type DragDropAnswer,
  type DragDropChallenge,
  type DragDropLayout,
  type DragDropState,
  type DropOutcome,
} from "@captchalab/captcha-plugins";
import { toRecorderEvent, type PointerSample } from "@/lib/pointer-adapter";

export interface LastDrop {
  itemId: string;
  outcome: DropOutcome;
  /** Target the item now rests on (null for a miss). */
  targetId: string | null;
  /** Item that was on that target and went back to its start. */
  bumpedItemId: string | null;
}

/** What the last keyboard action did, for the status line. Pointer drags never set it. */
export type KeyNotice = "selected" | "deselected" | "needs-selection" | null;

/** Coarse state for rendering. Emitted only when it changes (lift, drop, cancel), never per pointermove. */
export interface DragDropViewState {
  ready: boolean;
  /** Item currently held, or null. */
  activeItemId: string | null;
  /** Item picked with the keyboard and waiting for a drop area, or null. Independent of the pointer drag. */
  selectedItemId: string | null;
  keyNotice: KeyNotice;
  /** Target of each item at rest; a held item shows null (it is in the air). */
  placements: Readonly<Record<string, string | null>>;
  allPlaced: boolean;
  lastDrop: LastDrop | null;
}

export interface DragDropControllerOptions {
  recorder: EventRecorder;
  challenge: DragDropChallenge;
  /** Paint an item at a center (px). Imperative, called per move; must not set React state. */
  onItemPosition: (itemId: string, centerPx: Point) => void;
  onState: (state: DragDropViewState) => void;
  /** The user asked to verify (only possible when every item is on a target). */
  onVerify: (answer: DragDropAnswer, layout: DragDropLayout) => void;
  /** The surface changed size after input had already been recorded (geometry features become approximate). */
  onLayoutChangedAfterInput?: () => void;
}

interface ActiveDrag {
  pointerId: number;
  itemId: string;
  /** pointerdown position minus the item center, px. Kept for the whole drag. */
  grabOffset: Point;
  last: PointerSample;
}

/**
 * DOM-free interaction state machine for the drag & drop surface.
 *
 *  - Recording (pointerdown/move/up/cancel) writes normalized events with semantic targets and nothing else.
 *  - The drop decision is `resolveDrop` from the plugin (the same rule the feature extractor replays), using
 *    geometry, never the DOM event target (pointer capture makes that always the dragged item).
 *  - Layout is a cached snapshot. If it changes during a drag the attempt is cancelled (recorded as
 *    pointercancel, item returned, capture released, the rest of that pointer ignored). Layout is never
 *    measured per move; the caller snapshots the surface origin at pointerdown.
 *  - One active drag at a time; a second pointer is ignored.
 *
 * State is normalized, so a resize while idle just repaints items at the new pixel positions.
 */
export class DragDropController {
  private layout: DragDropLayout | null = null;
  private state: DragDropState;
  private active: ActiveDrag | null = null;
  private lastDrop: LastDrop | null = null;
  private selected: string | null = null;
  private keyNotice: KeyNotice = null;
  private readonly ignored = new Set<number>();
  private disposed = false;
  /** Set by the DOM layer so an aborted drag also releases pointer capture. */
  releasePointer: (pointerId: number) => void = () => {};

  constructor(private readonly opts: DragDropControllerOptions) {
    this.state = createInitialState(opts.challenge);
  }

  get isDragging(): boolean {
    return this.active !== null;
  }

  get currentLayout(): DragDropLayout | null {
    return this.layout;
  }

  /** null = not measurable. Invalid geometry disables interaction. */
  setLayout(layout: DragDropLayout | null): void {
    if (this.disposed) return;
    const valid = layout !== null && isValidLayout(layout);
    const changed = !valid || this.layout === null || layout.width !== this.layout.width || layout.height !== this.layout.height;
    if (this.active !== null && changed) this.abort(undefined, true);
    if (changed && this.layout !== null && this.opts.recorder.size > 0) this.opts.onLayoutChangedAfterInput?.();
    this.layout = valid ? layout : null;
    if (this.layout) this.paintAll();
    this.emit();
  }

  /** Returns true when a drag started: the caller should then capture the pointer. */
  pointerDown(sample: PointerSample, itemId: string): boolean {
    if (this.disposed || this.layout === null || this.active !== null) return false;
    const center = this.state.centers[itemId];
    if (!center) return false;
    this.ignored.delete(sample.pointerId); // a new press on a pointer that was ignored after an abort
    this.selected = null; // a pointer drag replaces a pending keyboard selection
    this.keyNotice = null;
    this.opts.recorder.record(toRecorderEvent("pointerdown", sample, makeDragItemTarget(itemId)));
    this.active = { pointerId: sample.pointerId, itemId, grabOffset: grabOffsetOf(normalizedToPx(center, this.layout), sample), last: sample };
    this.lastDrop = null;
    this.emit();
    return true;
  }

  pointerMove(sample: PointerSample): void {
    const a = this.active;
    if (this.disposed || this.layout === null || a === null || a.pointerId !== sample.pointerId) return;
    this.opts.recorder.record(toRecorderEvent("pointermove", sample, makeDragItemTarget(a.itemId)));
    a.last = sample;
    this.opts.onItemPosition(a.itemId, this.heldCenter(a, sample));
  }

  /** Returns true when this pointer's drag ended (the caller should release capture). */
  pointerUp(sample: PointerSample): boolean {
    const a = this.active;
    if (this.ignored.delete(sample.pointerId)) return false;
    if (this.disposed || this.layout === null || a === null || a.pointerId !== sample.pointerId) return false;
    this.opts.recorder.record(toRecorderEvent("pointerup", sample, makeDragItemTarget(a.itemId)));
    const res = resolveDrop(this.opts.challenge, this.layout, this.state, a.itemId, this.heldCenter(a, sample));
    this.state = res.state;
    this.active = null;
    this.lastDrop = { itemId: a.itemId, outcome: res.outcome, targetId: res.targetId, bumpedItemId: res.bumpedItemId };
    // Snap onto the target (a bumped occupant goes home), or return to where the item was before the drag.
    this.paintAll();
    this.emit();
    return true;
  }

  /** pointercancel from the browser. Records it and returns the item. */
  pointerCancel(pointerId: number, sample?: PointerSample): void {
    this.ignored.delete(pointerId);
    if (this.disposed || this.active === null || this.active.pointerId !== pointerId) return;
    this.abort(sample, false);
  }

  /** lostpointercapture / failed capture without a pointerup: abort; the pointer may still be down. */
  lostCapture(pointerId: number, sample?: PointerSample): void {
    if (this.disposed || this.active === null || this.active.pointerId !== pointerId) return;
    this.abort(sample, true);
  }

  /** Verify the current placements. Only when every item is on a target and nothing is held. */
  verify(): void {
    if (this.disposed || this.layout === null || this.active !== null || !allPlaced(this.opts.challenge, this.state)) return;
    this.opts.onVerify(buildAnswer(this.opts.challenge, this.state), this.layout);
  }

  /**
   * Keyboard input: Enter or Space on a shape selects it (again: unselects); Enter or Space on a drop area places the
   * selected shape there; Escape unselects. Placement goes through the SAME `resolveDrop` as a pointer release, with the
   * center of the chosen drop area as the release point, so a wrong area, an occupied area (the occupant goes back) and
   * a correction (the shape leaves its old area) behave exactly as they do for a drag. Ignored during a pointer drag.
   * Only the control key (`code`: Enter, Space or Escape) and the semantic target are recorded, never anything typed.
   */
  keySelect(itemId: string, code: string): void {
    if (this.disposed || this.layout === null || this.active !== null || !(itemId in this.state.centers)) return;
    this.opts.recorder.record({ type: "keydown", code, target: makeDragItemTarget(itemId) });
    this.lastDrop = null;
    if (this.selected === itemId) {
      this.selected = null;
      this.keyNotice = "deselected";
    } else {
      this.selected = itemId;
      this.keyNotice = "selected";
    }
    this.emit();
  }

  keyPlace(targetId: string, code: string): void {
    if (this.disposed || this.layout === null || this.active !== null) return;
    const target = this.opts.challenge.targets.find((t) => t.id === targetId);
    if (!target) return;
    this.opts.recorder.record({ type: "keydown", code, target: makeDropTarget(targetId) });
    const itemId = this.selected;
    if (itemId === null) {
      this.keyNotice = "needs-selection";
      this.emit();
      return;
    }
    const res = resolveDrop(this.opts.challenge, this.layout, this.state, itemId, normalizedToPx(target.position, this.layout));
    this.state = res.state;
    this.selected = null;
    this.keyNotice = null;
    this.lastDrop = { itemId, outcome: res.outcome, targetId: res.targetId, bumpedItemId: res.bumpedItemId };
    this.paintAll();
    this.emit();
  }

  keyCancel(code: string): void {
    if (this.disposed || this.layout === null || this.active !== null || this.selected === null) return;
    this.opts.recorder.record({ type: "keydown", code, target: makeDragItemTarget(this.selected) });
    this.selected = null;
    this.keyNotice = "deselected";
    this.lastDrop = null;
    this.emit();
  }

  /** Reverses dispose(); React StrictMode runs effect cleanup then setup on the same instance. */
  activate(): void {
    this.disposed = false;
  }

  dispose(): void {
    if (this.active) this.releasePointer(this.active.pointerId); // never leave a captured pointer behind
    this.disposed = true;
    this.active = null;
    this.selected = null;
    this.ignored.clear();
  }

  private heldCenter(a: ActiveDrag, s: PointerSample): Point {
    return heldCenterOf(s, a.grabOffset, this.layout as DragDropLayout);
  }

  private abort(sample: PointerSample | undefined, stillDown: boolean): void {
    const a = this.active;
    if (a === null) return;
    const at = sample ?? a.last;
    this.opts.recorder.record(toRecorderEvent("pointercancel", { ...at, pointerId: a.pointerId }, makeDragItemTarget(a.itemId)));
    this.active = null;
    if (stillDown) this.ignored.add(a.pointerId); // dropped by its pointerup/pointercancel
    this.releasePointer(a.pointerId);
    this.lastDrop = null;
    this.paint(a.itemId);
    this.emit();
  }

  private paint(itemId: string): void {
    const c = this.state.centers[itemId];
    if (c && this.layout) this.opts.onItemPosition(itemId, normalizedToPx(c, this.layout));
  }

  private paintAll(): void {
    for (const item of this.opts.challenge.items) this.paint(item.id);
  }

  private emit(): void {
    const placements: Record<string, string | null> = { ...this.state.placements };
    if (this.active) placements[this.active.itemId] = null; // in the air
    this.opts.onState({
      ready: this.layout !== null,
      activeItemId: this.active?.itemId ?? null,
      selectedItemId: this.selected,
      keyNotice: this.keyNotice,
      placements,
      allPlaced: this.active === null && allPlaced(this.opts.challenge, this.state),
      lastDrop: this.lastDrop,
    });
  }
}

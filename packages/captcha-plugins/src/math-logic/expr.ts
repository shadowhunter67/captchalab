import type { MathExpr, MathOp } from "./types";

export const num = (value: number): MathExpr => ({ kind: "num", value });
export const op = (o: MathOp, left: MathExpr, right: MathExpr): MathExpr => ({ kind: "op", op: o, left, right });

const MAX_DEPTH = 4;

/** Evaluates a tree with ordinary integer arithmetic. Returns null for a malformed or too deep tree. */
export function evalExpr(e: MathExpr, depth = 0): number | null {
  if (depth > MAX_DEPTH || typeof e !== "object" || e === null) return null;
  if (e.kind === "num") return Number.isSafeInteger(e.value) ? e.value : null;
  if (e.kind !== "op") return null;
  const a = evalExpr(e.left, depth + 1);
  const b = evalExpr(e.right, depth + 1);
  if (a === null || b === null) return null;
  const r = e.op === "+" ? a + b : e.op === "-" ? a - b : e.op === "*" ? a * b : null;
  return r !== null && Number.isSafeInteger(r) ? r : null;
}

const PRECEDENCE: Record<MathOp, number> = { "+": 1, "-": 1, "*": 2 };

/**
 * Renders the tree as text with only the parentheses that are needed (so "a x b + c" is shown without them and
 * "(a + b) x c" with them). The result is for display; it is never read back.
 */
export function formatExpr(e: MathExpr, symbols: { minus?: string; times?: string } = {}): string {
  const minus = symbols.minus ?? "−";
  const times = symbols.times ?? "×";
  const show = (x: MathExpr, parent: MathOp | null, side: "left" | "right"): string => {
    if (x.kind === "num") return String(x.value);
    const text = `${show(x.left, x.op, "left")} ${x.op === "-" ? minus : x.op === "*" ? times : "+"} ${show(x.right, x.op, "right")}`;
    if (parent === null) return text;
    const lower = PRECEDENCE[x.op] < PRECEDENCE[parent];
    const sameOnRight = PRECEDENCE[x.op] === PRECEDENCE[parent] && side === "right" && (parent === "-" || (parent === "*" && x.op !== "*"));
    return lower || sameOnRight ? `(${text})` : text;
  };
  return show(e, null, "left");
}

/** Operators used in a tree, in the order + - * (for the configuration block). */
export function operatorsIn(e: MathExpr): MathOp[] {
  const seen = new Set<MathOp>();
  const walk = (x: MathExpr): void => {
    if (x.kind === "op") {
      seen.add(x.op);
      walk(x.left);
      walk(x.right);
    }
  };
  walk(e);
  return (["+", "-", "*"] as const).filter((o) => seen.has(o));
}

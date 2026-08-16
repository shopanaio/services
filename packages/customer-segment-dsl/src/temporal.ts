import type { SegmentExpression, SegmentTemporalEvaluation } from "./types.js";

export type SegmentTemporalLeafEvaluator = (
  expression: Extract<SegmentExpression, { kind: "predicate" | "function" }>,
) => Promise<SegmentTemporalEvaluation> | SegmentTemporalEvaluation;

export async function evaluateSegmentTemporalBoundary(
  expression: SegmentExpression,
  evaluateLeaf: SegmentTemporalLeafEvaluator,
): Promise<SegmentTemporalEvaluation> {
  if (expression.kind === "predicate" || expression.kind === "function") {
    return evaluateLeaf(expression);
  }
  if (expression.kind === "not") {
    const child = await evaluateSegmentTemporalBoundary(expression.child, evaluateLeaf);
    return { value: !child.value, nextChangeAt: child.nextChangeAt };
  }
  const children = await Promise.all(
    expression.children.map((child) => evaluateSegmentTemporalBoundary(child, evaluateLeaf)),
  );
  if (expression.operator === "and") {
    const value = children.every((child) => child.value);
    return {
      value,
      nextChangeAt: minimumBoundary(value ? children : children.filter((child) => !child.value)),
    };
  }
  const value = children.some((child) => child.value);
  return {
    value,
    nextChangeAt: minimumBoundary(value ? children.filter((child) => child.value) : children),
  };
}

function minimumBoundary(values: readonly SegmentTemporalEvaluation[]): string | null {
  const boundaries = values
    .map((value) => value.nextChangeAt)
    .filter((value): value is string => value !== null)
    .sort();
  return boundaries[0] ?? null;
}

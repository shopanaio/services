import { describe, expect, it } from "@jest/globals";
import { evaluateSegmentTemporalBoundary, type SegmentExpression } from "../index.js";

const leaf = (attribute: string): SegmentExpression => ({
  kind: "predicate",
  attribute,
  operator: "eq",
  value: { kind: "boolean", value: true },
});

describe("Customer Segment temporal boundary composition", () => {
  it("tracks only false children that can change a false AND", async () => {
    const root: SegmentExpression = {
      kind: "logical",
      operator: "and",
      children: [leaf("false_late"), leaf("true_early")],
    };
    const result = await evaluateSegmentTemporalBoundary(root, (expression) =>
      expression.kind === "predicate" && expression.attribute === "false_late"
        ? { value: false, nextChangeAt: "2026-08-18T00:00:00.000Z" }
        : { value: true, nextChangeAt: "2026-08-17T00:00:00.000Z" },
    );
    expect(result).toEqual({ value: false, nextChangeAt: "2026-08-18T00:00:00.000Z" });
  });

  it("composes OR and NOT without losing the next relevant boundary", async () => {
    const root: SegmentExpression = {
      kind: "not",
      child: {
        kind: "logical",
        operator: "or",
        children: [leaf("active"), leaf("inactive")],
      },
    };
    const result = await evaluateSegmentTemporalBoundary(root, (expression) =>
      expression.kind === "predicate" && expression.attribute === "active"
        ? { value: true, nextChangeAt: "2026-08-17T00:00:00.000Z" }
        : { value: false, nextChangeAt: "2026-08-16T12:00:00.000Z" },
    );
    expect(result).toEqual({ value: false, nextChangeAt: "2026-08-17T00:00:00.000Z" });
  });
});

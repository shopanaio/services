import { describe, expect, it } from "@jest/globals";
import {
  fullUnicodeCaseFold,
  fullUnicodeNfkc,
  SegmentRegistry,
  validatePersistedSegmentDefinition,
  validateSegmentQuery,
  type SegmentAttributeDescriptor,
  type SegmentStoreEvaluationContext,
} from "../index.js";

const descriptor = (
  input: Pick<SegmentAttributeDescriptor, "name" | "type" | "operators" | "dependencies" | "temporalContract"> &
    Partial<SegmentAttributeDescriptor>,
): SegmentAttributeDescriptor => ({
  presentationKey: input.name,
  kind: "SCALAR",
  availability: "AVAILABLE",
  nullable: false,
  normalizationContract: "test-v1",
  indexContract: ["test_idx"],
  complexityCost: 1,
  sourceKind: "scalar",
  ...input,
});

const registry = new SegmentRegistry([
  descriptor({
    name: "company_name",
    type: "String",
    operators: ["eq", "neq", "is_null", "is_not_null"],
    dependencies: ["company"],
    temporalContract: "NONE",
    nullable: true,
    normalizeString: (value) => fullUnicodeCaseFold(fullUnicodeNfkc(value)).trim(),
  }),
  descriptor({
    name: "amount_spent",
    type: "Money",
    operators: ["eq", "gte", "between"],
    dependencies: ["statistics.order", "statistics.refund"],
    temporalContract: "NONE",
    nonNegative: true,
  }),
  descriptor({
    name: "last_order_date",
    type: "Date",
    operators: ["eq", "lt", "between", "is_null", "is_not_null"],
    dependencies: ["statistics.order"],
    temporalContract: "VALUE",
    nullable: true,
  }),
  descriptor({
    name: "future_attribute",
    type: "String",
    operators: ["eq"],
    dependencies: ["profile"],
    temporalContract: "NONE",
    availability: "UNAVAILABLE",
    unavailabilityReason: "projection unavailable",
  }),
  descriptor({
    name: "future_datetime",
    type: "DateTime",
    operators: ["eq"],
    dependencies: ["profile"],
    temporalContract: "NONE",
  }),
]);

const storeContext: SegmentStoreEvaluationContext = {
  storeId: "01900000-0000-7000-8000-000000000001",
  currencyCode: "USD",
  currencyExponent: 2,
  timeZone: "Europe/Kyiv",
  configurationRevision: 7,
};

describe("Customer Segment DSL semantic analyzer", () => {
  it("normalizes values, derives metadata and prints a deterministic query", async () => {
    const result = await validateSegmentQuery(
      "COMPANY_NAME = 'Straße' and amount_spent >= 12.3",
      registry,
      { storeContext, effectiveAt: "2026-08-16T10:00:00.000Z" },
    );
    expect(result).toMatchObject({
      valid: true,
      canonicalQuery: "company_name = 'strasse' AND amount_spent >= 12.30",
      definition: {
        version: 1,
        dependencies: ["company", "statistics.order", "statistics.refund"],
        contextDependencies: ["currency"],
        temporal: false,
      },
    });
    expect(() => validatePersistedSegmentDefinition(result.definition, registry, storeContext)).not.toThrow();
  });

  it("validates calendar ranges and marks relative dates temporal", async () => {
    const invalid = await validateSegmentQuery(
      "last_order_date = 2026-02-30",
      registry,
      { storeContext },
    );
    expect(invalid.valid).toBe(false);
    expect(invalid.diagnostics[0]?.code).toBe("SEGMENT_INVALID_DATE");

    const temporal = await validateSegmentQuery(
      "last_order_date < -90d",
      registry,
      { storeContext, effectiveAt: "2026-08-16T10:00:00.000Z" },
    );
    expect(temporal.definition).toMatchObject({
      temporal: true,
      contextDependencies: ["timezone"],
    });
  });

  it("fails closed for unavailable descriptors and inexact money", async () => {
    const unavailable = await validateSegmentQuery("future_attribute = 'x'", registry, { storeContext });
    expect(unavailable.diagnostics[0]?.code).toBe("SEGMENT_ATTRIBUTE_UNAVAILABLE");
    const money = await validateSegmentQuery("amount_spent = 1.001", registry, { storeContext });
    expect(money.diagnostics[0]?.code).toBe("SEGMENT_INVALID_MONEY");
  });

  it("resolves offset-less datetimes in the Store timezone at the semantic boundary", async () => {
    const result = await validateSegmentQuery(
      "future_datetime = 2026-08-16T14:30:00",
      registry,
      { storeContext },
    );
    expect(result).toMatchObject({
      valid: true,
      canonicalQuery: "future_datetime = 2026-08-16T11:30:00.000Z",
      definition: { contextDependencies: ["timezone"] },
    });
  });

  it("rejects persisted AST that bypasses registry or canonical normalization", async () => {
    const result = await validateSegmentQuery("company_name = 'Straße'", registry, { storeContext });
    const definition = structuredClone(result.definition!);
    if (definition.root.kind !== "predicate" || !("value" in definition.root)) return;
    (definition.root as { value: { kind: "string"; value: string } }).value = {
      kind: "string",
      value: "Straße",
    };
    expect(() => validatePersistedSegmentDefinition(definition, registry, storeContext)).toThrow(
      /Persisted segment definition is corrupt/u,
    );

    const unsupportedOperator = structuredClone(result.definition!);
    if (unsupportedOperator.root.kind !== "predicate") return;
    Object.assign(unsupportedOperator.root, { operator: "contains" });
    expect(() => validatePersistedSegmentDefinition(unsupportedOperator, registry, storeContext)).toThrow(
      /Persisted segment definition is corrupt/u,
    );
  });
});

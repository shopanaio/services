import { z } from "zod";
import type {
  SegmentDefinitionV1,
  SegmentExpression,
  SegmentFunctionParameter,
  SegmentValue,
} from "./types.js";
import { parseCalendarDate, validateDateTime } from "./date-time.js";

const strict = <T extends z.ZodRawShape>(shape: T) => z.object(shape).strict();

export const SegmentValueSchema: z.ZodType<SegmentValue> = z.union([
  strict({ kind: z.literal("string"), value: z.string() }),
  strict({ kind: z.literal("enum"), value: z.string() }),
  strict({ kind: z.literal("boolean"), value: z.boolean() }),
  strict({ kind: z.literal("integer"), value: z.string().regex(/^-?(?:0|[1-9]\d*)$/u) }),
  strict({ kind: z.literal("decimal"), value: z.string().regex(/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/u) }),
  strict({
    kind: z.literal("money"),
    decimal: z.string().regex(/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/u),
    minor: z.string().regex(/^-?(?:0|[1-9]\d*)$/u),
    currencyCode: z.string().regex(/^[A-Z]{3}$/u),
  }),
  strict({
    kind: z.literal("date"),
    value: z.string().regex(/^\d{4}-\d{2}-\d{2}$/u).refine((value) => parseCalendarDate(value) !== null),
  }),
  strict({
    kind: z.literal("dateTime"),
    value: z.string().refine(validateDateTime),
  }),
  strict({ kind: z.literal("namedDate"), value: z.enum(["today", "yesterday"]) }),
  strict({
    kind: z.literal("relativeDate"),
    amount: z.number().int(),
    unit: z.enum(["day", "week", "month", "year"]),
  }),
  strict({
    kind: z.literal("entityId"),
    entity: z.string().regex(/^[A-Za-z][A-Za-z0-9]*$/u),
    id: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u),
  }),
]);

const scalarOperator = z.enum(["eq", "neq", "gt", "gte", "lt", "lte"]);
const nullOperator = z.enum(["is_null", "is_not_null"]);

export const SegmentFunctionParameterSchema: z.ZodType<SegmentFunctionParameter> = z.union([
  strict({ name: z.string(), operator: scalarOperator, value: SegmentValueSchema }),
  strict({
    name: z.string(),
    operator: z.literal("between"),
    value: SegmentValueSchema,
    upperValue: SegmentValueSchema,
  }),
  strict({
    name: z.string(),
    operator: z.enum(["in", "not_in"]),
    values: z.tuple([SegmentValueSchema]).rest(SegmentValueSchema),
  }),
  strict({ name: z.string(), operator: nullOperator }),
]);

export const SegmentExpressionSchema: z.ZodType<SegmentExpression> = z.lazy(() =>
  z.union([
    strict({
      kind: z.literal("logical"),
      operator: z.enum(["and", "or"]),
      children: z
        .tuple([SegmentExpressionSchema, SegmentExpressionSchema])
        .rest(SegmentExpressionSchema),
    }),
    strict({ kind: z.literal("not"), child: SegmentExpressionSchema }),
    strict({
      kind: z.literal("predicate"),
      attribute: z.string(),
      operator: scalarOperator,
      value: SegmentValueSchema,
    }),
    strict({
      kind: z.literal("predicate"),
      attribute: z.string(),
      operator: z.literal("between"),
      value: SegmentValueSchema,
      upperValue: SegmentValueSchema,
    }),
    strict({
      kind: z.literal("predicate"),
      attribute: z.string(),
      operator: z.enum(["in", "not_in"]),
      values: z.tuple([SegmentValueSchema]).rest(SegmentValueSchema),
    }),
    strict({
      kind: z.literal("predicate"),
      attribute: z.string(),
      operator: nullOperator,
    }),
    strict({
      kind: z.literal("predicate"),
      attribute: z.string(),
      operator: z.enum(["contains", "not_contains"]),
      value: SegmentValueSchema,
    }),
    strict({
      kind: z.literal("function"),
      name: z.string(),
      operator: z.enum(["matches", "not_matches"]),
      parameters: z.array(SegmentFunctionParameterSchema),
    }),
    strict({ kind: z.literal("function"), name: z.string(), operator: nullOperator }),
  ]),
);

export const SegmentDefinitionV1Schema: z.ZodType<SegmentDefinitionV1> = strict({
  version: z.literal(1),
  root: SegmentExpressionSchema,
  dependencies: z.array(
    z.enum([
      "customer.any",
      "profile",
      "contact",
      "company",
      "status",
      "address",
      "consent",
      "tag",
      "group",
      "taxIdentifier",
      "taxExemption",
      "statistics.order",
      "statistics.checkout",
      "statistics.refund",
    ]),
  ),
  contextDependencies: z.array(z.enum(["currency", "timezone"])),
  evaluationContext: strict({
    currencyCode: z.string().regex(/^[A-Z]{3}$/u),
    timeZone: z.string().min(1),
    storeConfigurationRevision: z.number().int().nonnegative(),
  }),
  temporal: z.boolean(),
});

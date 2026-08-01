import {
  CATALOG_CHECKOUT_MERCHANDISE_MAX_LINES,
  CATALOG_CHECKOUT_MERCHANDISE_MAX_NESTING_DEPTH,
} from "@shopana/broker-types";
import type { Catalog } from "@shopana/broker-types";
import { CURRENCY_CODES, LOCALE_CODES } from "@shopana/shared-references";
import { z } from "zod";

const identifierSchema = z.string().trim().min(1).max(256);
const quantitySchema = z.number().int().safe().positive();

const componentSelectionSchema = z
  .object({ componentItemId: identifierSchema })
  .strict();

function createLineSchema(
  remainingChildDepth: number,
): z.ZodType<Catalog.ResolveCheckoutMerchandiseLineInput> {
  const childrenSchema =
    remainingChildDepth === 0
      ? z.array(z.never()).max(0)
      : z
          .array(createLineSchema(remainingChildDepth - 1))
          .max(CATALOG_CHECKOUT_MERCHANDISE_MAX_LINES);

  return z
    .object({
      lineId: identifierSchema,
      variantId: identifierSchema,
      componentSelection: componentSelectionSchema.nullable(),
      quantity: quantitySchema,
      children: childrenSchema,
    })
    .strict() as z.ZodType<Catalog.ResolveCheckoutMerchandiseLineInput>;
}

const lineSchema = createLineSchema(
  CATALOG_CHECKOUT_MERCHANDISE_MAX_NESTING_DEPTH - 1,
);

const paramsShapeSchema = z
  .object({
    storeId: identifierSchema,
    currencyCode: z.enum(CURRENCY_CODES as [string, ...string[]]),
    localeCode: z.enum(LOCALE_CODES as [string, ...string[]]).nullable(),
    effectiveAt: z.string().datetime({ offset: true }),
    lines: z.array(lineSchema).max(CATALOG_CHECKOUT_MERCHANDISE_MAX_LINES),
  })
  .strict()
  .superRefine((params, context) => {
    const lineIds = new Set<string>();
    let lineCount = 0;

    const visit = (
      lines: Catalog.ResolveCheckoutMerchandiseLineInput[],
      nested: boolean,
    ): void => {
      for (const line of lines) {
        lineCount += 1;
        if (nested !== (line.componentSelection !== null)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: nested
              ? `Nested checkout line ${line.lineId} requires componentSelection`
              : `Root checkout line ${line.lineId} cannot have componentSelection`,
            path: ["lines"],
          });
        }
        if (lineIds.has(line.lineId)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Duplicate checkout line ID: ${line.lineId}`,
            path: ["lines"],
          });
        }
        lineIds.add(line.lineId);
        visit(line.children, true);
      }
    };

    visit(params.lines, false);

    if (lineCount > CATALOG_CHECKOUT_MERCHANDISE_MAX_LINES) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Checkout merchandise contains more than ${CATALOG_CHECKOUT_MERCHANDISE_MAX_LINES} lines`,
        path: ["lines"],
      });
    }
  });

/** Reject oversized/deep trees before the recursive typed parser traverses them. */
const treeLimitsSchema = z.unknown().superRefine((value, context) => {
  if (typeof value !== "object" || value === null || !("lines" in value)) return;
  const rootLines = (value as { lines?: unknown }).lines;
  if (!Array.isArray(rootLines)) return;

  const pending: Array<{ lines: unknown[]; depth: number }> = [
    { lines: rootLines, depth: 1 },
  ];
  let total = 0;

  while (pending.length > 0) {
    const current = pending.pop()!;
    if (
      current.depth > CATALOG_CHECKOUT_MERCHANDISE_MAX_NESTING_DEPTH ||
      current.lines.length > CATALOG_CHECKOUT_MERCHANDISE_MAX_LINES
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Checkout merchandise tree exceeds contract limits",
        path: ["lines"],
      });
      return;
    }

    total += current.lines.length;
    if (total > CATALOG_CHECKOUT_MERCHANDISE_MAX_LINES) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Checkout merchandise contains more than ${CATALOG_CHECKOUT_MERCHANDISE_MAX_LINES} lines`,
        path: ["lines"],
      });
      return;
    }

    for (const line of current.lines) {
      if (typeof line !== "object" || line === null || !("children" in line)) {
        continue;
      }
      const children = (line as { children?: unknown }).children;
      if (Array.isArray(children) && children.length > 0) {
        pending.push({ lines: children, depth: current.depth + 1 });
      }
    }
  }
});

export const resolveCheckoutMerchandiseParamsSchema: z.ZodType<Catalog.ResolveCheckoutMerchandiseParams> =
  treeLimitsSchema.pipe(paramsShapeSchema) as z.ZodType<
    Catalog.ResolveCheckoutMerchandiseParams
  >;

import { CURRENCY_CODES, LOCALE_CODES } from "@shopana/shared-references";
import type { Pricing } from "@shopana/broker-types";
import { z } from "zod";

const id = z.string().trim().min(1).max(256);
const revision = z.string().trim().min(1).max(256);
const currency = z.enum(CURRENCY_CODES as [string, ...string[]]);
const json: z.ZodType<unknown> = z.lazy(() =>
  z.union([z.null(), z.string(), z.boolean(), z.number().finite(), z.array(json), z.record(json)]),
);
const purchase = z.discriminatedUnion("type", [
  z.object({ type: z.literal("ONE_TIME"), sellingPlanId: z.null() }).strict(),
  z.object({ type: z.literal("SUBSCRIPTION"), sellingPlanId: id }).strict(),
]);
const line: z.ZodType<Pricing.PricingCheckoutCartLineIntent> = z.lazy(
  () =>
    z
      .object({
        lineId: id,
        variantId: id,
        componentSelection: z.object({ componentItemId: id }).strict().nullable(),
        quantity: z.number().int().safe().positive(),
        purchase,
        attributes: z.record(json) as never,
        children: z.array(line).max(250),
      })
      .strict() as never,
);
const context = z
  .object({
    executionId: id,
    checkoutId: id,
    expectedCheckoutVersion: z.number().int().safe().nonnegative(),
    currencyCode: currency,
    correlationId: id,
    deadlineAt: z.string().datetime({ offset: true }),
    requestedAt: z.string().datetime({ offset: true }),
    storeId: id,
    localeCode: z.enum(LOCALE_CODES as [string, ...string[]]).nullable(),
    channelCode: id,
    effectiveAt: z.string().datetime({ offset: true }),
    buyerEligibility: z
      .object({
        customerId: id.nullable(),
        countryCode: z
          .string()
          .regex(/^[A-Z]{2}$/)
          .nullable(),
        marketId: id.nullable(),
        companyId: id.nullable(),
        segmentIds: z.array(id),
        segmentMembershipRevision: revision.nullable(),
      })
      .strict()
      .nullable(),
  })
  .strict();
const cartIntent = z
  .object({
    lines: z.array(line).max(250),
    discountCodes: z.array(z.string().trim().min(1).max(255)).max(500),
    destinations: z.array(
      z
        .object({
          destinationId: id,
          location: z
            .object({
              countryCode: z.string().regex(/^[A-Z]{2}$/),
              provinceCode: z.string().nullable(),
              postalCode: z.string().nullable(),
            })
            .strict(),
          lineIds: z.array(id),
        })
        .strict(),
    ),
    attributes: z.record(json) as never,
  })
  .strict();

const preliminaryParamsShape = z
  .object({ context, cartIntent })
  .strict()
  .superRefine((value, ctx) => {
    const ids = new Set<string>();
    let count = 0;
    const visit = (
      lines: readonly Pricing.PricingCheckoutCartLineIntent[],
      nested: boolean,
      depth: number,
    ) => {
      for (const current of lines) {
        count++;
        if (depth > 8) ctx.addIssue({ code: "custom", message: "Cart exceeds 8 nesting levels" });
        if (ids.has(current.lineId))
          ctx.addIssue({ code: "custom", message: `Duplicate line ID ${current.lineId}` });
        ids.add(current.lineId);
        if (nested !== (current.componentSelection !== null))
          ctx.addIssue({
            code: "custom",
            message: `Invalid component selection on ${current.lineId}`,
          });
        visit(current.children, true, depth + 1);
      }
    };
    visit(value.cartIntent.lines, false, 1);
    if (count > 250) ctx.addIssue({ code: "custom", message: "Cart exceeds 250 lines" });
  });
const preliminaryTreeLimits = z.unknown().superRefine((value, ctx) => {
  const roots =
    value && typeof value === "object" && "cartIntent" in value
      ? (value as { cartIntent?: unknown }).cartIntent
      : null;
  const lines =
    roots && typeof roots === "object" && "lines" in roots
      ? (roots as { lines?: unknown }).lines
      : null;
  if (!Array.isArray(lines)) return;
  const pending: Array<{ rows: unknown[]; depth: number }> = [{ rows: lines, depth: 1 }];
  let count = 0;
  while (pending.length) {
    const current = pending.pop()!;
    count += current.rows.length;
    if (current.depth > 8 || count > 250) {
      ctx.addIssue({ code: "custom", message: "Cart tree exceeds checkout contract limits" });
      return;
    }
    for (const row of current.rows) {
      const children =
        row && typeof row === "object" && "children" in row
          ? (row as { children?: unknown }).children
          : null;
      if (Array.isArray(children) && children.length)
        pending.push({ rows: children, depth: current.depth + 1 });
    }
  }
});
export const calculateCheckoutPreliminaryQuoteParamsSchema: z.ZodType<Pricing.CalculateCheckoutPreliminaryQuoteParams> =
  preliminaryTreeLimits.pipe(preliminaryParamsShape) as never;

const money = z.object({ amountMinor: z.string().regex(/^\d+$/), currencyCode: currency }).strict();
const discountCodeReference = z
  .object({ codeId: id, inputCode: z.string(), normalizedCode: z.string() })
  .strict();
const discountSource = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("NATIVE") }).strict(),
  z
    .object({
      kind: z.literal("FUNCTION"),
      functionBindingId: id,
      implementationId: id,
      functionTarget: id,
      executionId: id,
      planRevision: revision,
    })
    .strict(),
]);
const discountAllocation = z.discriminatedUnion("targetType", [
  z
    .object({
      targetType: z.literal("LINE"),
      lineId: id,
      quantity: z.number().int().positive().nullable(),
      amount: money,
    })
    .strict(),
  z.object({ targetType: z.literal("DELIVERY_GROUP"), groupId: id, amount: money }).strict(),
]);
const discountApplication = z
  .object({
    applicationId: id,
    discountId: id,
    configurationRevision: revision,
    discountClass: z.enum(["PRODUCT", "ORDER", "SHIPPING"]),
    method: z.enum(["AUTOMATIC", "CODE"]),
    code: discountCodeReference.nullable(),
    source: discountSource,
    title: z.string(),
    priority: z.number().int().safe().nonnegative(),
    amount: money,
    allocations: z.array(discountAllocation),
    metadata: z.record(json).nullable(),
  })
  .strict();
const codeResolution = z.discriminatedUnion("status", [
  z
    .object({
      inputCode: z.string(),
      normalizedCode: z.string(),
      status: z.literal("APPLIED"),
      discountId: id,
      codeId: id,
      applicationIds: z.array(id),
    })
    .strict(),
  z
    .object({
      inputCode: z.string(),
      normalizedCode: z.string(),
      status: z.literal("PENDING"),
      discountId: id,
      codeId: id,
      reason: z.literal("AWAITING_DELIVERY"),
    })
    .strict(),
  z
    .object({
      inputCode: z.string(),
      normalizedCode: z.string(),
      status: z.literal("REJECTED"),
      discountId: id.nullable(),
      codeId: id.nullable(),
      reason: z.enum([
        "NOT_FOUND",
        "DISABLED",
        "NOT_ACTIVE",
        "CHANNEL_NOT_ELIGIBLE",
        "PURCHASE_TYPE_NOT_ELIGIBLE",
        "BUYER_NOT_ELIGIBLE",
        "USAGE_LIMIT_REACHED",
        "MINIMUM_REQUIREMENT_NOT_MET",
        "TARGET_NOT_ELIGIBLE",
        "COMBINATION_EXCLUDED",
        "FUNCTION_FAILED",
        "INVALID_FUNCTION_OUTPUT",
      ]),
      message: z.string(),
      retryable: z.boolean(),
    })
    .strict(),
]);
const usageRequirement = z
  .object({
    applicationId: id,
    discountId: id,
    codeId: id.nullable(),
    customerId: id.nullable(),
    configurationRevision: revision,
    usageCounterRevision: revision,
    reservationRequired: z.boolean(),
  })
  .strict();
const quotedLine: z.ZodType<Pricing.PricingCheckoutQuotedLine> = z.lazy(
  () =>
    z
      .object({
        lineId: id,
        contributesToTotals: z.boolean(),
        quantity: z.number().int().safe().positive(),
        purchase,
        merchandise: z
          .object({
            variantId: id,
            revision,
            title: z.string(),
            sku: z.string().nullable(),
            imageUrl: z.string().nullable(),
            isPhysical: z.boolean(),
            targeting: z
              .object({
                productId: id,
                categoryIds: z.array(id),
                tagIds: z.array(id),
                featureIds: z.array(id),
                optionValueIds: z.array(id),
              })
              .strict(),
            data: z.record(json).nullable(),
          })
          .strict(),
        availability: z
          .object({
            available: z.boolean(),
            maxQuantity: z.number().int().nonnegative().nullable(),
            continueSellingWhenOutOfStock: z.boolean(),
            reasonCode: z.string().nullable(),
            revision,
          })
          .strict(),
        unitPrice: money,
        originalUnitPrice: money,
        compareAtUnitPrice: money.nullable(),
        subtotal: money,
        total: money,
        discountAllocations: z.array(
          z
            .object({
              applicationId: id,
              amount: money,
              quantity: z.number().int().positive().nullable(),
            })
            .strict(),
        ),
        children: z.array(quotedLine),
      })
      .strict() as never,
);
const sourceLineResolution = z.discriminatedUnion("status", [
  z
    .object({ sourceLineId: id, status: z.literal("TRANSFORMED"), transformedLineIds: z.array(id) })
    .strict(),
  z
    .object({
      sourceLineId: id,
      status: z.literal("REMOVED"),
      reason: z.object({ code: id, message: z.string() }).strict(),
    })
    .strict(),
]);
const deliveryIntent = z
  .object({
    revision,
    lineage: z.array(z.object({ lineId: id, sourceLineIds: z.array(id) }).strict()),
    destinations: z.array(
      z
        .object({
          destinationId: id,
          location: z
            .object({
              countryCode: z.string().regex(/^[A-Z]{2}$/),
              provinceCode: z.string().nullable(),
              postalCode: z.string().nullable(),
            })
            .strict(),
          transformedLineIds: z.array(id),
        })
        .strict(),
    ),
    unassignedPhysicalLineIds: z.array(id),
  })
  .strict();
export const preliminaryCheckoutQuoteResultSchema = z
  .object({
    preliminaryQuoteId: id,
    revision,
    executionId: id,
    checkoutId: id,
    basedOnCheckoutVersion: z.number().int().nonnegative(),
    currencyCode: currency,
    discountEvaluationRevision: revision,
    transformedLines: z.array(quotedLine),
    sourceLineResolutions: z.array(sourceLineResolution),
    deliveryIntent,
    merchandiseRevision: revision,
    availabilityRevision: revision,
    appliedDiscounts: z.array(discountApplication),
    discountCodeResolutions: z.array(codeResolution),
    usageRequirements: z.array(usageRequirement),
    preliminaryTotals: z
      .object({
        merchandiseSubtotal: money,
        merchandiseDiscountTotal: money,
        merchandiseTotal: money,
      })
      .strict(),
  })
  .strict();
const delivery = z
  .object({
    executionId: id,
    checkoutId: id,
    basedOnCheckoutVersion: z.number().int().nonnegative(),
    currencyCode: currency,
    revision,
    basedOnPreliminaryRevision: revision,
    groups: z.array(
      z
        .object({
          groupId: id,
          lineIds: z.array(id),
          options: z.array(
            z
              .object({
                handle: id,
                code: id,
                carrierCode: id.nullable(),
                deliveryMethodType: z.enum([
                  "LOCAL",
                  "NONE",
                  "PICK_UP",
                  "PICKUP_POINT",
                  "RETAIL",
                  "SHIPPING",
                ]),
                cost: money,
              })
              .strict(),
          ),
          selectedOptionHandle: id.nullable(),
        })
        .strict(),
    ),
  })
  .strict();
export const finalizeCheckoutPricingQuoteParamsSchema: z.ZodType<Pricing.FinalizeCheckoutPricingQuoteParams> =
  z
    .object({ context, preliminary: preliminaryCheckoutQuoteResultSchema, delivery })
    .strict() as never;

export const finalCheckoutQuoteResultSchema = z
  .object({
    quoteId: id,
    revision,
    executionId: id,
    checkoutId: id,
    basedOnCheckoutVersion: z.number().int().nonnegative(),
    currencyCode: currency,
    discountEvaluationRevision: revision,
    basedOnPreliminaryDiscountEvaluationRevision: revision,
    basedOnPreliminaryRevision: revision,
    basedOnDeliveryRevision: revision,
    lines: z.array(quotedLine),
    appliedDiscounts: z.array(discountApplication),
    discountCodeResolutions: z.array(codeResolution),
    usageRequirements: z.array(usageRequirement),
    totals: z
      .object({
        merchandiseSubtotal: money,
        merchandiseDiscountTotal: money,
        merchandiseTotal: money,
        taxTotal: money,
        deliverySubtotal: money,
        deliveryDiscountTotal: money,
        deliveryTotal: money,
        payableTotal: money,
      })
      .strict(),
  })
  .strict();

export const reserveCheckoutDiscountUsageParamsSchema: z.ZodType<Pricing.ReserveCheckoutDiscountUsageParams> =
  z
    .object({
      storeId: id,
      checkoutId: id,
      quoteId: id,
      quoteRevision: revision,
      idempotencyKey: id,
      expiresAt: z.string().datetime({ offset: true }),
      requirements: z.array(usageRequirement),
    })
    .strict() as never;
export const commitCheckoutDiscountUsageParamsSchema: z.ZodType<Pricing.CommitCheckoutDiscountUsageParams> =
  z
    .object({
      storeId: id,
      checkoutId: id,
      quoteId: id,
      quoteRevision: revision,
      orderId: id,
      idempotencyKey: id,
      reservationIds: z.array(id).max(500),
    })
    .strict();
export const releaseCheckoutDiscountUsageParamsSchema: z.ZodType<Pricing.ReleaseCheckoutDiscountUsageParams> =
  z.object({ storeId: id, reservationIds: z.array(id).min(1).max(500) }).strict();
export const expireCheckoutDiscountUsageParamsSchema: z.ZodType<Pricing.ExpireCheckoutDiscountUsageParams> =
  z
    .object({
      storeId: id,
      effectiveAt: z.string().datetime({ offset: true }),
      limit: z.number().int().min(1).max(500).optional(),
    })
    .strict();
export const reverseCheckoutDiscountUsageParamsSchema: z.ZodType<Pricing.ReverseCheckoutDiscountUsageParams> =
  z
    .object({
      storeId: id,
      redemptionIds: z.array(id).min(1).max(500),
      reason: z.string().trim().min(1).max(1000),
    })
    .strict();

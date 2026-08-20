import type { Catalog } from "@shopana/broker-types";
import { CURRENCY_CODES } from "@shopana/shared-references";
import { z } from "zod";

const id = z.string().trim().min(1).max(256);
const revision = id;
const currency = z.enum(CURRENCY_CODES as [string, ...string[]]);
const money = z.object({ amountMinor: z.string().regex(/^\d+$/), currencyCode: currency }).strict();
const purchase = z.discriminatedUnion("type", [
  z.object({ type: z.literal("ONE_TIME"), sellingPlanId: z.null() }).strict(),
  z.object({ type: z.literal("SUBSCRIPTION"), sellingPlanId: id }).strict(),
]);
const priceRule = z.discriminatedUnion("strategy", [
  z.object({ strategy: z.literal("BASE") }).strict(),
  z.object({ strategy: z.literal("FREE") }).strict(),
  z.object({ strategy: z.literal("OVERRIDE"), amount: money }).strict(),
  z
    .object({
      strategy: z.literal("ADJUSTMENT"),
      operation: z.enum(["DECREASE", "INCREASE"]),
      value: z.discriminatedUnion("type", [
        z.object({ type: z.literal("FIXED_AMOUNT"), amount: money }).strict(),
        z
          .object({
            type: z.literal("PERCENTAGE"),
            percentageBps: z.number().int().min(0).max(10_000),
          })
          .strict(),
      ]),
    })
    .strict(),
]);
const resolvedLine = z
  .object({
    lineId: id,
    parentLineId: id.nullable(),
    variantId: id,
    productId: id,
    quantity: z.number().int().safe().positive(),
    purchase,
    revision,
    title: z.string().min(1),
    sku: z.string().nullable(),
    imageUrl: z.string().url().nullable(),
    requiresShipping: z.boolean(),
    requiresComponents: z.boolean(),
    price: z.object({ price: money, compareAtPrice: money.nullable(), revision }).strict(),
    availability: z
      .object({
        available: z.boolean(),
        tracked: z.boolean(),
        availableQuantity: z.number().int().safe().nonnegative().nullable(),
        continueSellingWhenOutOfStock: z.boolean(),
        unavailabilityReason: z.enum(["OUT_OF_STOCK", "INSUFFICIENT_STOCK"]).nullable(),
        revision,
      })
      .strict(),
    targeting: z
      .object({
        categoryIds: z.array(id),
        tagIds: z.array(id),
        featureIds: z.array(id),
        optionValueIds: z.array(id),
      })
      .strict(),
    componentConfiguration: z.object({ configurationId: id, revision }).strict().nullable(),
    componentSelection: z
      .object({ configurationId: id, groupId: id, componentItemId: id, revision, priceRule })
      .strict()
      .nullable(),
  })
  .strict();
const line = z.discriminatedUnion("status", [
  z.object({ status: z.literal("RESOLVED"), line: resolvedLine }).strict(),
  z
    .object({
      status: z.literal("REJECTED"),
      lineId: id,
      parentLineId: id.nullable(),
      variantId: id,
      componentItemId: id.nullable(),
      code: z.enum([
        "VARIANT_NOT_FOUND",
        "PRODUCT_NOT_FOUND",
        "PRODUCT_NOT_PUBLISHED",
        "PRICE_NOT_FOUND",
        "CURRENCY_NOT_SUPPORTED",
        "INVALID_COMPONENT_SELECTION",
      ]),
      message: z.string(),
    })
    .strict(),
]);

export const catalogMerchandiseResultSchema: z.ZodType<Catalog.ResolveCheckoutMerchandiseResult> =
  z.discriminatedUnion("ok", [
    z
      .object({
        ok: z.literal(true),
        merchandiseRevision: revision,
        availabilityRevision: revision,
        lines: z.array(line).max(250),
      })
      .strict(),
    z
      .object({
        ok: z.literal(false),
        code: z.enum(["CATALOG_STORE_NOT_FOUND", "CHECKOUT_MERCHANDISE_RESOLUTION_FAILED"]),
        message: z.string(),
        retryable: z.boolean(),
      })
      .strict(),
  ]) as never;

import { z } from "zod";
import type { Delivery } from "@shopana/broker-types";

const id = z.string().trim().min(1).max(512);
const timestamp = z.string().datetime({ offset: true });
const json = z.record(z.unknown());
const context = z
  .object({
    executionId: id,
    correlationId: id,
    deadlineAt: timestamp,
    requestedAt: timestamp,
    checkoutId: id,
    expectedCheckoutVersion: z.number().int().safe().nonnegative(),
    targetCheckoutVersion: z.number().int().safe().positive(),
    storeId: id,
    currencyCode: z.string().regex(/^[A-Z]{3}$/),
    localeCode: z.string().max(64).nullable(),
    channelCode: id,
    effectiveAt: timestamp,
    buyerEligibility: z
      .object({
        customerId: id.nullable(),
        countryCode: z
          .string()
          .regex(/^[A-Z]{2}$/)
          .nullable(),
        marketId: id.nullable(),
        companyId: id.nullable(),
        segmentIds: z.array(id).max(250),
        segmentMembershipRevision: id.nullable(),
      })
      .strict()
      .nullable(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.targetCheckoutVersion !== value.expectedCheckoutVersion + 1)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["targetCheckoutVersion"],
        message: "targetCheckoutVersion must equal expectedCheckoutVersion + 1",
      });
    if (Date.parse(value.deadlineAt) <= Date.parse(value.requestedAt))
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["deadlineAt"],
        message: "deadlineAt must be after requestedAt",
      });
  });
const address = z
  .object({
    id,
    address1: z.string(),
    address2: z.string().nullable(),
    city: z.string().min(1),
    countryCode: z.string().regex(/^[A-Z]{2}$/),
    provinceCode: z.string().nullable(),
    provinceName: z.string().nullable(),
    postalCode: z.string().nullable(),
    firstName: z.string().nullable(),
    middleName: z.string().nullable(),
    lastName: z.string().nullable(),
    company: z.string().nullable(),
    email: z.string().nullable(),
    phone: z.string().nullable(),
    providerData: json.nullable(),
  })
  .strict();

export const CalculateCheckoutDeliveryOptionsParamsSchema: z.ZodType<Delivery.CalculateCheckoutDeliveryOptionsParams> =
  z
    .object({
      context,
      preliminary: z.any(),
      destinations: z
        .array(z.object({ destinationId: id, address, lineIds: z.array(id).max(250) }).strict())
        .max(250),
      selections: z
        .array(z.object({ groupId: id, optionHandle: id, customerInput: json.nullable() }).strict())
        .max(250),
      cartAttributes: json,
    })
    .strict() as z.ZodType<Delivery.CalculateCheckoutDeliveryOptionsParams>;

export function parseCalculateCheckoutDeliveryOptionsResult(
  value: unknown,
): Delivery.CalculateCheckoutDeliveryOptionsResult {
  if (
    value === null ||
    typeof value !== "object" ||
    !Array.isArray((value as { groups?: unknown }).groups)
  )
    throw new Error("Delivery checkout result is invalid");
  return value as Delivery.CalculateCheckoutDeliveryOptionsResult;
}

export const SearchDeliveryOptionChoicesParamsSchema: z.ZodType<Delivery.SearchDeliveryOptionChoicesParams> =
  z
    .object({
      storeId: id,
      checkoutId: id,
      checkoutVersion: z.number().int().safe().positive(),
      groupId: id,
      optionHandle: id,
      query: z.string().trim().max(255),
      cursor: id.nullable(),
      limit: z.number().int().safe().min(1).max(100),
      correlationId: id,
      deadlineAt: timestamp,
      effectiveAt: timestamp,
    })
    .strict();

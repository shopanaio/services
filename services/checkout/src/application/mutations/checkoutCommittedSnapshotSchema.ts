import { z } from "zod";
import {
  checkoutCartIntentSchema,
  checkoutLoyaltyRedemptionIntentSchema,
  checkoutPipelineJsonObjectSchema,
  checkoutRecalculationResultSchema,
} from "../pipeline/schemas.js";

const identifier = z.string().trim().min(1).max(256);
const nullableText = z.string().max(4_096).nullable();
const timestamp = z.string().datetime({ offset: true });

const buyerIdentity = z
  .object({
    customerId: identifier.nullable(),
    email: z.string().email().nullable(),
    phone: nullableText,
    countryCode: z
      .string()
      .regex(/^[A-Z]{2}$/)
      .nullable(),
    firstName: nullableText,
    middleName: nullableText,
    lastName: nullableText,
    marketId: identifier.nullable(),
    companyId: identifier.nullable(),
    data: checkoutPipelineJsonObjectSchema.nullable(),
  })
  .strict();

const billingAddress = z
  .object({
    firstName: nullableText,
    lastName: nullableText,
    company: nullableText,
    address1: nullableText,
    address2: nullableText,
    city: nullableText,
    countryCode: z
      .string()
      .regex(/^[A-Z]{2}$/)
      .nullable(),
    provinceCode: nullableText,
    postalCode: nullableText,
    phone: nullableText,
    data: checkoutPipelineJsonObjectSchema.nullable(),
  })
  .strict();

export const checkoutCommittedSnapshotSchema = z
  .object({
    checkoutId: identifier,
    storeId: identifier,
    version: z.number().int().positive(),
    createdAt: timestamp,
    updatedAt: timestamp,
    lifecycle: z
      .object({
        status: z.enum(["OPEN", "READY", "PLACED", "EXPIRED", "ABANDONED"]),
        expiresAt: timestamp,
        piiAnonymizedAt: timestamp.nullable(),
        retentionUntil: timestamp,
      })
      .strict(),
    draft: z
      .object({
        checkoutId: identifier,
        storeId: identifier,
        version: z.number().int().positive(),
        currencyCode: z.string().regex(/^[A-Z]{3}$/),
        localeCode: z.string().min(2).max(35).nullable(),
        channelCode: identifier,
        externalSource: nullableText,
        externalId: nullableText,
        buyerIdentity: buyerIdentity.nullable(),
        billingAddress: billingAddress.nullable(),
        cartIntent: checkoutCartIntentSchema,
        customerNote: nullableText,
        tags: z.array(
          z
            .object({
              id: identifier,
              slug: identifier,
              isUnique: z.boolean(),
            })
            .strict(),
        ),
        lineTagAssignments: z.array(
          z
            .object({
              lineId: identifier,
              tagId: identifier,
            })
            .strict(),
        ),
        loyaltyRedemption: checkoutLoyaltyRedemptionIntentSchema.nullable(),
      })
      .strict(),
    result: checkoutRecalculationResultSchema,
  })
  .strict()
  .superRefine((snapshot, context) => {
    if (
      snapshot.checkoutId !== snapshot.draft.checkoutId ||
      snapshot.storeId !== snapshot.draft.storeId ||
      snapshot.version !== snapshot.draft.version
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Snapshot identity does not match its draft",
      });
    }
  });

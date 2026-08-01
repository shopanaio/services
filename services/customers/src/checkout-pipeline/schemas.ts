import type { Customers } from "@shopana/broker-types";
import { z } from "zod";

const identifierSchema = z.string().trim().min(1).max(256);
const timestampSchema = z.string().datetime({ offset: true });

export const resolveBuyerEligibilityParamsSchema: z.ZodType<Customers.ResolveCheckoutBuyerEligibilityParams> =
  z
    .object({
      storeId: identifierSchema,
      customerId: identifierSchema,
      effectiveAt: timestampSchema,
    })
    .strict();

export const resolveBuyerEligibilityResultSchema: z.ZodType<Customers.ResolveCheckoutBuyerEligibilityResult> =
  z.discriminatedUnion("ok", [
    z
      .object({
        ok: z.literal(true),
        storeId: identifierSchema,
        customerId: identifierSchema,
        effectiveAt: timestampSchema,
        segmentIds: z.array(identifierSchema).max(500),
        segmentMembershipRevision: identifierSchema,
      })
      .strict()
      .superRefine((result, context) => {
        if (new Set(result.segmentIds).size !== result.segmentIds.length) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["segmentIds"],
            message: "Customer segment IDs must be unique",
          });
        }
      }),
    z
      .object({
        ok: z.literal(false),
        code: z.enum([
          "CUSTOMER_NOT_FOUND",
          "BUYER_ELIGIBILITY_RESOLUTION_FAILED",
        ]),
        message: z.string().trim().min(1),
        retryable: z.boolean(),
      })
      .strict(),
  ]);

export function parseResolveBuyerEligibilityResult(
  params: Customers.ResolveCheckoutBuyerEligibilityParams,
  value: unknown,
): Customers.ResolveCheckoutBuyerEligibilityResult {
  const result = resolveBuyerEligibilityResultSchema.parse(value);
  if (
    result.ok &&
    (result.storeId !== params.storeId ||
      result.customerId !== params.customerId ||
      result.effectiveAt !== params.effectiveAt)
  ) {
    throw new Error("Customer eligibility result does not match its request");
  }
  return result;
}

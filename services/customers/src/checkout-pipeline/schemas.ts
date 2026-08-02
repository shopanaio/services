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

export function parseResolveBuyerEligibilityParams(
  value: unknown,
): Customers.ResolveCheckoutBuyerEligibilityParams {
  return resolveBuyerEligibilityParamsSchema.parse(value);
}

export const resolveBuyerEligibilityResultSchema: z.ZodType<Customers.ResolveCheckoutBuyerEligibilityResult> =
  z.union([
    z
      .object({
        ok: z.literal(true),
        storeId: identifierSchema,
        customerId: identifierSchema,
        effectiveAt: timestampSchema,
        segmentIds: z
          .array(identifierSchema)
          .max(500)
          .superRefine((segmentIds, context) => {
            if (new Set(segmentIds).size !== segmentIds.length) {
              context.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Customer segment IDs must be unique",
              });
            }
            if (
              segmentIds.some(
                (segmentId, index) =>
                  index > 0 &&
                  segmentIds[index - 1] > segmentId,
              )
            ) {
              context.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Customer segment IDs must be sorted",
              });
            }
          }),
        segmentMembershipRevision: identifierSchema,
      })
      .strict(),
    failureSchema("CUSTOMER_NOT_FOUND", false),
    z
      .object({
        ok: z.literal(false),
        code: z.literal("CUSTOMER_NOT_ELIGIBLE"),
        reason: z.enum(["DISABLED", "BLOCKED", "MERGED", "REDACTED"]),
        message: z.string().trim().min(1),
        retryable: z.literal(false),
      })
      .strict(),
    failureSchema("BUYER_ELIGIBILITY_LIMIT_EXCEEDED", false),
    failureSchema("BUYER_ELIGIBILITY_RESOLUTION_FAILED", true),
  ]);

function failureSchema<TCode extends string, TRetryable extends boolean>(
  code: TCode,
  retryable: TRetryable,
) {
  return z
    .object({
      ok: z.literal(false),
      code: z.literal(code),
      message: z.string().trim().min(1),
      retryable: z.literal(retryable),
    })
    .strict();
}

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

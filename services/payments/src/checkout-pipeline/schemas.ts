import { z } from "zod";
import type { Payments } from "@shopana/broker-types";

const id = z.string().trim().min(1).max(256);
const revision = id;
const timestamp = z.string().datetime({ offset: true });
const version = z.number().int().safe().nonnegative();
const country = z.string().regex(/^[A-Z]{2}$/);
const money = z
  .object({ amountMinor: z.string().regex(/^\d+$/).max(128), currencyCode: id })
  .strict();
const jsonValue: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.null(),
    z.boolean(),
    z.number().finite(),
    z.string().max(65_536),
    z.array(jsonValue).max(500),
    z.record(jsonValue),
  ]),
);
const jsonObject = z.record(jsonValue).nullable();
const provenance = {
  executionId: id,
  checkoutId: id,
  currencyCode: id,
} as const;
const capabilities = z
  .object({
    supportsAsynchronousCompletion: z.boolean(),
    supportsSettlementConfirmation: z.boolean(),
    supportsPartialCapture: z.boolean(),
    supportsMultipleCaptures: z.boolean(),
    supportsPartialRefund: z.boolean(),
    supportsMultipleRefunds: z.boolean(),
    supportsReconciliation: z.boolean(),
    supportsDisputes: z.boolean(),
  })
  .strict();
const providerOperation = z.enum([
  "validateConfiguration",
  "getMethods",
  "createPayment",
  "confirmPayment",
  "cancel",
  "capture",
  "void",
  "refund",
  "reconcile",
]);
const paymentFailure = z
  .object({
    category: z.enum([
      "DECLINED",
      "FRAUD_SUSPECTED",
      "INVALID_REQUEST",
      "NOT_SUPPORTED",
      "CONFIGURATION",
      "AUTHENTICATION",
      "PROVIDER_UNAVAILABLE",
      "TIMEOUT",
      "RATE_LIMITED",
      "CONFLICT",
      "UNKNOWN",
    ]),
    code: id,
    message: z.string().trim().min(1).max(2_000),
    retryable: z.boolean(),
    providerCode: id.nullable(),
  })
  .strict();
export const providerConfigurationResultSchema = z
  .object({
    status: z.enum(["READY", "DEGRADED", "INVALID"]),
    providerCode: id,
    displayName: z.string().trim().min(1).max(255),
    supportedCurrencyCodes: z.array(id).max(250),
    supportedCountryCodes: z.array(country).max(250),
    supportedSessionKinds: z.array(z.enum(["SALE", "AUTHORIZATION"])).max(2),
    supportedOperations: z.array(providerOperation).max(9),
    capabilities,
    failure: paymentFailure.nullable(),
    configurationRevision: revision,
  })
  .strict()
  .superRefine((value, ctx) => {
    if (
      (value.status === "INVALID" && value.failure === null) ||
      (value.status === "READY" && value.failure !== null)
    )
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["failure"],
        message: "provider configuration status and failure must agree",
      });
    for (const [key, values] of Object.entries({
      supportedCurrencyCodes: value.supportedCurrencyCodes,
      supportedCountryCodes: value.supportedCountryCodes,
      supportedSessionKinds: value.supportedSessionKinds,
      supportedOperations: value.supportedOperations,
    }))
      if (new Set(values).size !== values.length)
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: "provider configuration values must be unique",
        });
  });

export const paymentsCheckoutRequestSchema = z
  .object({
    context: z
      .object({
        executionId: id,
        checkoutId: id,
        currencyCode: id,
        correlationId: id,
        deadlineAt: timestamp,
        requestedAt: timestamp,
        storeId: id,
        localeCode: id.nullable(),
        channelCode: id,
        effectiveAt: timestamp,
        buyerEligibility: z
          .object({
            customerId: id.nullable(),
            countryCode: country.nullable(),
            marketId: id.nullable(),
            companyId: id.nullable(),
            segmentIds: z.array(id).max(500),
            segmentMembershipRevision: revision.nullable(),
          })
          .strict()
          .nullable(),
      })
      .strict(),
    selection: z.object({ methodHandle: id, customerInput: jsonObject }).strict().nullable(),
    finalQuote: z
      .object({
        ...provenance,
        quoteId: id,
        revision,
        discountEvaluationRevision: revision,
        basedOnPreliminaryDiscountEvaluationRevision: revision,
        basedOnPreliminaryRevision: revision,
        basedOnDeliveryRevision: revision,
        lines: z.array(jsonValue).max(500),
        appliedDiscounts: z.array(jsonValue).max(500),
        discountCodeResolutions: z.array(jsonValue).max(500),
        usageRequirements: z.array(jsonValue).max(500),
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
      .strict(),
    payableAmount: money,
    loyaltyRedemption: z
      .object({ quoteId: id, quoteRevision: revision, discount: money })
      .strict()
      .nullable(),
    delivery: z
      .object({
        ...provenance,
        revision,
        basedOnPreliminaryRevision: revision,
        destinations: z
          .array(
            z
              .object({
                destinationId: id,
                location: z
                  .object({
                    countryCode: country,
                    provinceCode: id.nullable(),
                    postalCode: id.nullable(),
                  })
                  .strict(),
              })
              .strict(),
          )
          .max(500),
        groups: z
          .array(
            z
              .object({
                groupId: id,
                destinationId: id,
                lineIds: z.array(id).max(500),
                selectedOption: z
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
                  .strict()
                  .nullable(),
              })
              .strict(),
          )
          .max(500),
      })
      .strict(),
  })
  .strict()
  .superRefine((value, ctx) => {
    const { context, finalQuote, delivery } = value;
    if (Buffer.byteLength(JSON.stringify(value), "utf8") > 1_048_576)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "payment discovery request exceeds the payload limit",
      });
    if (context.targetCheckoutVersion !== context.expectedCheckoutVersion + 1)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["context", "targetCheckoutVersion"],
        message: "target checkout version must equal base version + 1",
      });
    if (Date.parse(context.deadlineAt) <= Date.now())
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["context", "deadlineAt"],
        message: "payment discovery deadline has expired",
      });
    for (const item of [finalQuote, delivery])
      if (
        item.executionId !== context.executionId ||
        item.checkoutId !== context.checkoutId ||
        item.basedOnCheckoutVersion !== context.expectedCheckoutVersion ||
        item.currencyCode !== context.currencyCode
      )
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "payment input provenance mismatch" });
    if (finalQuote.basedOnDeliveryRevision !== delivery.revision)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["finalQuote", "basedOnDeliveryRevision"],
        message: "final quote is based on another delivery revision",
      });
    if (finalQuote.basedOnPreliminaryRevision !== delivery.basedOnPreliminaryRevision)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["delivery", "basedOnPreliminaryRevision"],
        message: "delivery and final quote use different preliminary revisions",
      });
    for (const total of Object.values(finalQuote.totals))
      if (total.currencyCode !== context.currencyCode)
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "payment input contains mixed currencies",
        });
    const totals = finalQuote.totals;
    if (
      BigInt(totals.merchandiseSubtotal.amountMinor) -
        BigInt(totals.merchandiseDiscountTotal.amountMinor) !==
        BigInt(totals.merchandiseTotal.amountMinor) ||
      BigInt(totals.deliverySubtotal.amountMinor) -
        BigInt(totals.deliveryDiscountTotal.amountMinor) !==
        BigInt(totals.deliveryTotal.amountMinor) ||
      BigInt(totals.merchandiseTotal.amountMinor) +
        BigInt(totals.taxTotal.amountMinor) +
        BigInt(totals.deliveryTotal.amountMinor) !==
        BigInt(totals.payableTotal.amountMinor)
    )
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["finalQuote", "totals"],
        message: "final quote totals are inconsistent",
      });
    const loyaltyDiscount =
      value.loyaltyRedemption === null ? 0n : BigInt(value.loyaltyRedemption.discount.amountMinor);
    if (
      value.payableAmount.currencyCode !== context.currencyCode ||
      (value.loyaltyRedemption !== null &&
        value.loyaltyRedemption.discount.currencyCode !== context.currencyCode)
    )
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["payableAmount"],
        message: "loyalty payment amounts use another currency",
      });
    if (
      BigInt(totals.payableTotal.amountMinor) - loyaltyDiscount !==
      BigInt(value.payableAmount.amountMinor)
    )
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["payableAmount"],
        message: "payable amount does not match final quote and loyalty redemption",
      });
    const destinationIds = new Set(delivery.destinations.map((item) => item.destinationId));
    const assignedLineIds = new Set<string>();
    if (
      destinationIds.size !== delivery.destinations.length ||
      new Set(delivery.groups.map((item) => item.groupId)).size !== delivery.groups.length
    )
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["delivery"],
        message: "delivery identifiers must be unique",
      });
    for (const group of delivery.groups) {
      if (!destinationIds.has(group.destinationId))
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["delivery", "groups"],
          message: "delivery group references an unknown destination",
        });
      if (
        group.selectedOption?.cost.currencyCode !== undefined &&
        group.selectedOption.cost.currencyCode !== context.currencyCode
      )
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["delivery", "groups"],
          message: "selected delivery option uses another currency",
        });
      if (new Set(group.lineIds).size !== group.lineIds.length)
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["delivery", "groups"],
          message: "delivery group line identifiers must be unique",
        });
      for (const lineId of group.lineIds) {
        if (assignedLineIds.has(lineId))
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["delivery", "groups"],
            message: "delivery line is assigned to more than one group",
          });
        assignedLineIds.add(lineId);
      }
    }
  });

export const providerDiscoveryResultSchema = z
  .object({
    revision,
    methods: z
      .array(
        z
          .object({
            methodKey: id,
            code: id,
            title: z.string().trim().min(1).max(255),
            flow: z.enum(["ONLINE", "OFFLINE", "ON_DELIVERY"]),
            supportedSessionKinds: z.array(z.enum(["SALE", "AUTHORIZATION"])).max(2),
            supportedCaptureModes: z.array(z.enum(["AUTOMATIC", "MANUAL"])).max(2),
            capabilities,
            metadata: jsonObject,
          })
          .strict(),
      )
      .max(100),
  })
  .strict()
  .superRefine((value, ctx) => {
    const keys = value.methods.map((method) => method.methodKey);
    if (new Set(keys).size !== keys.length)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["methods"],
        message: "provider method keys must be unique",
      });
    value.methods.forEach((method, index) => {
      if (
        method.metadata !== null &&
        (Buffer.byteLength(JSON.stringify(method.metadata), "utf8") > 32_768 ||
          jsonDepth(method.metadata) > 16)
      )
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["methods", index, "metadata"],
          message: "provider metadata exceeds the public projection limit",
        });
      if (
        new Set(method.supportedSessionKinds).size !== method.supportedSessionKinds.length ||
        new Set(method.supportedCaptureModes).size !== method.supportedCaptureModes.length
      )
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["methods", index],
          message: "provider method capabilities must not contain duplicates",
        });
      if (
        method.supportedSessionKinds.length === 0 ||
        method.supportedCaptureModes.length === 0 ||
        (method.capabilities.supportsMultipleCaptures &&
          !method.capabilities.supportsPartialCapture) ||
        (method.capabilities.supportsMultipleRefunds && !method.capabilities.supportsPartialRefund)
      )
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["methods", index, "capabilities"],
          message: "provider method capabilities are internally inconsistent",
        });
    });
  });

export const paymentCustomizationResultSchema = z
  .object({
    operations: z
      .array(
        z.discriminatedUnion("type", [
          z.object({ type: z.literal("HIDE"), methodHandle: id, reasonCode: id }).strict(),
          z
            .object({
              type: z.literal("MOVE"),
              methodHandle: id,
              index: z.number().int().safe().nonnegative(),
            })
            .strict(),
          z
            .object({
              type: z.literal("RENAME"),
              methodHandle: id,
              title: z.string().trim().min(1).max(255),
            })
            .strict(),
        ]),
      )
      .max(250),
  })
  .strict();

const checkoutMethod = z
  .object({
    handle: id,
    code: id,
    title: z.string().min(1).max(255),
    provider: id,
    flow: z.enum(["ONLINE", "OFFLINE", "ON_DELIVERY"]),
    metadata: jsonObject,
  })
  .strict();
const selection = z.discriminatedUnion("status", [
  z.object({ status: z.literal("NONE") }).strict(),
  z.object({ status: z.literal("SELECTED"), methodHandle: id, customerInput: jsonObject }).strict(),
  z
    .object({
      status: z.literal("RESET"),
      previousMethodHandle: id,
      customerInput: jsonObject,
      reason: z.object({ code: id, message: z.string().min(1).max(1024) }).strict(),
    })
    .strict(),
]);
export const paymentsCheckoutResultSchema = z
  .object({
    ...provenance,
    revision,
    discoveryRevision: revision,
    customizationRevision: revision,
    basedOnFinalQuoteRevision: revision,
    basedOnLoyaltyQuoteRevision: revision.nullable(),
    basedOnDeliveryRevision: revision,
    methods: z.array(checkoutMethod).max(500),
    selection,
    issues: z
      .array(
        z
          .object({
            code: id,
            message: z.string().min(1).max(1024),
            severity: z.enum(["WARNING", "ERROR"]),
            retryable: z.boolean(),
          })
          .strict(),
      )
      .max(500),
  })
  .strict()
  .superRefine((value, ctx) => {
    const handles = value.methods.map((method) => method.handle);
    if (new Set(handles).size !== handles.length)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["methods"],
        message: "payment method handles must be unique",
      });
    if (value.selection.status === "SELECTED" && !handles.includes(value.selection.methodHandle))
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["selection"],
        message: "selected payment method must be available",
      });
  });

export function parsePaymentsCheckoutRequest(
  value: unknown,
): Payments.GetCheckoutAvailablePaymentMethodsParams {
  return paymentsCheckoutRequestSchema.parse(
    value,
  ) as Payments.GetCheckoutAvailablePaymentMethodsParams;
}
export function parsePaymentsCheckoutResult(
  value: unknown,
): Payments.GetCheckoutAvailablePaymentMethodsResult {
  return paymentsCheckoutResultSchema.parse(
    value,
  ) as Payments.GetCheckoutAvailablePaymentMethodsResult;
}
function jsonDepth(value: unknown): number {
  if (value === null || typeof value !== "object") return 0;
  if (Array.isArray(value)) return 1 + Math.max(0, ...value.map(jsonDepth));
  return 1 + Math.max(0, ...Object.values(value as Record<string, unknown>).map(jsonDepth));
}

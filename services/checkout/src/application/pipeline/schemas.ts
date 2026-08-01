import { z } from "zod";
import { CURRENCY_CODES, LOCALE_CODES } from "@shopana/shared-references";

import type {
  CheckoutCartLineIntent,
  CheckoutPipelineJsonValue,
  CheckoutQuotedLine,
} from "./contracts/index.js";

export const CHECKOUT_PIPELINE_MAX_PAYLOAD_BYTES = 1_048_576;
export const CHECKOUT_PIPELINE_MAX_LINES = 250;
export const CHECKOUT_PIPELINE_MAX_LINE_NESTING_DEPTH = 8;
export const CHECKOUT_PIPELINE_MAX_JSON_DEPTH = 32;
export const CHECKOUT_PIPELINE_MAX_COLLECTION_ITEMS = 500;

const identifierSchema = z.string().trim().min(1).max(256);
const revisionSchema = z.string().trim().min(1).max(256);
const checkoutVersionSchema = z.number().int().safe().nonnegative();
const currencyCodeSchema = z.enum(CURRENCY_CODES as [string, ...string[]]);
const localeCodeSchema = z.enum(LOCALE_CODES as [string, ...string[]]);
const countryCodeSchema = z.string().regex(/^[A-Z]{2}$/);
const timestampSchema = z.string().datetime({ offset: true });
const nonNegativeIntegerSchema = z.number().int().safe().nonnegative();
const positiveIntegerSchema = z.number().int().safe().positive();
const collection = <T extends z.ZodTypeAny>(schema: T) =>
  z.array(schema).max(CHECKOUT_PIPELINE_MAX_COLLECTION_ITEMS);

const checkoutLinePurchaseIntentSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("ONE_TIME"),
      sellingPlanId: z.null(),
    })
    .strict(),
  z
    .object({
      type: z.literal("SUBSCRIPTION"),
      sellingPlanId: identifierSchema,
    })
    .strict(),
]);

export const checkoutPipelineStageSchema = z.enum([
  "PRICING_PRELIMINARY",
  "DELIVERY",
  "PRICING_FINAL",
  "PAYMENT",
  "VALIDATION",
]);

export const checkoutPipelineStageStatusSchema = z.enum([
  "SUCCESS",
  "FAILED",
  "SKIPPED",
]);

function createJsonValueSchema(
  remainingDepth: number,
): z.ZodType<CheckoutPipelineJsonValue> {
  const primitiveSchema = z.union([
    z.null(),
    z.boolean(),
    z.number().finite(),
    z.string().max(CHECKOUT_PIPELINE_MAX_PAYLOAD_BYTES),
  ]);
  if (remainingDepth === 0) {
    return primitiveSchema;
  }
  const childSchema = createJsonValueSchema(remainingDepth - 1);
  return z.union([
    primitiveSchema,
    collection(childSchema),
    z.record(childSchema).superRefine((value, context) => {
      if (Object.keys(value).length > CHECKOUT_PIPELINE_MAX_COLLECTION_ITEMS) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "JSON object has too many properties",
        });
      }
    }),
  ]);
}

export const checkoutPipelineJsonValueSchema = createJsonValueSchema(
  CHECKOUT_PIPELINE_MAX_JSON_DEPTH,
);

export const checkoutPipelineJsonObjectSchema = z
  .record(checkoutPipelineJsonValueSchema)
  .superRefine((value, context) => {
    if (Object.keys(value).length > CHECKOUT_PIPELINE_MAX_COLLECTION_ITEMS) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "JSON object has too many properties",
      });
    }
  });

export const checkoutPipelineMoneySchema = z
  .object({
    amountMinor: z.string().max(128).regex(/^-?\d+$/),
    currencyCode: currencyCodeSchema,
  })
  .strict();

const checkoutPipelineNonNegativeMoneySchema = checkoutPipelineMoneySchema.refine(
  ({ amountMinor }) => BigInt(amountMinor) >= 0n,
  "Money amount must not be negative",
);

export const checkoutPipelineStageProvenanceSchema = z
  .object({
    executionId: identifierSchema,
    checkoutId: identifierSchema,
    basedOnCheckoutVersion: checkoutVersionSchema,
    currencyCode: currencyCodeSchema,
  })
  .strict();

export const checkoutPipelineBuyerSchema = z
  .object({
    customerId: identifierSchema.nullable(),
    email: z.string().email().nullable(),
    phone: z.string().trim().min(1).nullable(),
    countryCode: countryCodeSchema.nullable(),
    marketId: identifierSchema.nullable(),
    companyId: identifierSchema.nullable(),
    segmentIds: collection(identifierSchema),
    segmentMembershipRevision: revisionSchema.nullable(),
    data: checkoutPipelineJsonObjectSchema.nullable(),
  })
  .strict()
  .superRefine((buyer, context) => {
    if (
      buyer.customerId === null &&
      (buyer.segmentIds.length > 0 || buyer.segmentMembershipRevision !== null)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["segmentIds"],
        message: "Guest buyer cannot have customer segment membership",
      });
    }
    if (
      buyer.customerId !== null &&
      buyer.segmentMembershipRevision === null
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["segmentMembershipRevision"],
        message: "Customer buyer requires a segment membership revision",
      });
    }
  });

export const checkoutBuyerEligibilityContextSchema = z
  .object({
    customerId: identifierSchema.nullable(),
    countryCode: countryCodeSchema.nullable(),
    marketId: identifierSchema.nullable(),
    companyId: identifierSchema.nullable(),
    segmentIds: collection(identifierSchema),
    segmentMembershipRevision: revisionSchema.nullable(),
  })
  .strict()
  .superRefine((buyer, context) => {
    if (
      buyer.customerId === null &&
      (buyer.segmentIds.length > 0 || buyer.segmentMembershipRevision !== null)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["segmentIds"],
        message: "Guest buyer cannot have customer segment membership",
      });
    }
    if (
      buyer.customerId !== null &&
      buyer.segmentMembershipRevision === null
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["segmentMembershipRevision"],
        message: "Customer buyer requires a segment membership revision",
      });
    }
  });

export const checkoutPipelineAddressSchema = z
  .object({
    id: identifierSchema,
    address1: z.string().trim().min(1),
    address2: z.string().trim().min(1).nullable(),
    city: z.string().trim().min(1),
    countryCode: countryCodeSchema,
    provinceCode: z.string().trim().min(1).nullable(),
    provinceName: z.string().trim().min(1).nullable(),
    postalCode: z.string().trim().min(1).nullable(),
    firstName: z.string().trim().min(1).nullable(),
    middleName: z.string().trim().min(1).nullable(),
    lastName: z.string().trim().min(1).nullable(),
    company: z.string().trim().min(1).nullable(),
    email: z.string().email().nullable(),
    phone: z.string().trim().min(1).nullable(),
    providerData: checkoutPipelineJsonObjectSchema.nullable(),
  })
  .strict();

export const checkoutPipelineIssueSchema = z
  .object({
    stage: checkoutPipelineStageSchema,
    code: identifierSchema,
    message: z.string().min(1),
    severity: z.enum(["WARNING", "ERROR"]),
    effect: z.enum(["CONTINUE", "STOP"]),
    field: collection(z.string().min(1).max(256)).optional(),
    lineId: identifierSchema.optional(),
    retryable: z.boolean(),
  })
  .strict();

export const checkoutPipelineStageTraceSchema = z
  .object({
    stage: checkoutPipelineStageSchema,
    status: checkoutPipelineStageStatusSchema,
    startedAt: timestampSchema,
    completedAt: timestampSchema,
    durationMs: nonNegativeIntegerSchema,
    inputRevision: revisionSchema.optional(),
    outputRevision: revisionSchema.optional(),
  })
  .strict();

export const checkoutPipelineExecutionTraceSchema = z
  .object({
    executionId: identifierSchema,
    correlationId: identifierSchema,
    startedAt: timestampSchema,
    completedAt: timestampSchema,
    stages: collection(checkoutPipelineStageTraceSchema),
  })
  .strict();

const checkoutPipelineStageContextShape = {
  executionId: identifierSchema,
  correlationId: identifierSchema,
  deadlineAt: timestampSchema,
  requestedAt: timestampSchema,
  checkoutId: identifierSchema,
  expectedCheckoutVersion: checkoutVersionSchema,
  storeId: identifierSchema,
  currencyCode: currencyCodeSchema,
  localeCode: localeCodeSchema.nullable(),
  channelCode: identifierSchema,
  effectiveAt: timestampSchema,
} as const;

function refineDeadline(
  context: { deadlineAt: string; requestedAt: string },
  refinementContext: z.RefinementCtx,
): void {
  if (Date.parse(context.deadlineAt) <= Date.parse(context.requestedAt)) {
    refinementContext.addIssue({
      code: z.ZodIssueCode.custom,
      message: "deadlineAt must be later than requestedAt",
      path: ["deadlineAt"],
    });
  }
}

export const checkoutPipelineStageContextSchema = z
  .object(checkoutPipelineStageContextShape)
  .strict()
  .superRefine(refineDeadline);

export const checkoutPipelineEligibilityContextSchema = z
  .object({
    ...checkoutPipelineStageContextShape,
    buyerEligibility: checkoutBuyerEligibilityContextSchema.nullable(),
  })
  .strict()
  .superRefine(refineDeadline);

export const checkoutPipelineExecutionContextSchema = z
  .object({
    ...checkoutPipelineStageContextShape,
    buyer: checkoutPipelineBuyerSchema.nullable(),
  })
  .strict()
  .superRefine(refineDeadline);

function createCartLineIntentSchema(
  remainingDepth: number,
): z.ZodType<CheckoutCartLineIntent> {
  const childrenSchema =
    remainingDepth === 1
      ? z.array(z.never()).max(0)
      : collection(createCartLineIntentSchema(remainingDepth - 1));
  return z
    .object({
      lineId: identifierSchema,
      variantId: identifierSchema,
      componentSelection: z
        .object({ componentItemId: identifierSchema })
        .strict()
        .nullable(),
      quantity: positiveIntegerSchema,
      purchase: checkoutLinePurchaseIntentSchema,
      attributes: checkoutPipelineJsonObjectSchema,
      children: childrenSchema,
    })
    .strict();
}

export const checkoutCartLineIntentSchema = createCartLineIntentSchema(
  CHECKOUT_PIPELINE_MAX_LINE_NESTING_DEPTH,
);

export const checkoutDeliveryDestinationIntentSchema = z
  .object({
    destinationId: identifierSchema,
    address: checkoutPipelineAddressSchema,
    lineIds: collection(identifierSchema),
  })
  .strict();

export const checkoutDeliveryOptionSelectionIntentSchema = z
  .object({
    groupId: identifierSchema,
    optionHandle: identifierSchema,
    customerInput: checkoutPipelineJsonObjectSchema.nullable(),
  })
  .strict();

export const checkoutPaymentMethodSelectionIntentSchema = z
  .object({
    methodHandle: identifierSchema,
    customerInput: checkoutPipelineJsonObjectSchema.nullable(),
  })
  .strict();

export const checkoutCartIntentSchema = z
  .object({
    lines: collection(checkoutCartLineIntentSchema),
    discountCodes: collection(z.string().trim().min(1).max(256)),
    destinations: collection(checkoutDeliveryDestinationIntentSchema),
    selectedDeliveryOptions: collection(
      checkoutDeliveryOptionSelectionIntentSchema,
    ),
    selectedPaymentMethod:
      checkoutPaymentMethodSelectionIntentSchema.nullable(),
    attributes: checkoutPipelineJsonObjectSchema,
  })
  .strict()
  .superRefine((intent, context) => {
    const visit = (
      lines: readonly CheckoutCartLineIntent[],
      nested: boolean,
    ): void => {
      for (const line of lines) {
        if (nested !== (line.componentSelection !== null)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["lines"],
            message: nested
              ? `Nested checkout line ${line.lineId} requires componentSelection`
              : `Root checkout line ${line.lineId} cannot have componentSelection`,
          });
        }
        visit(line.children, true);
      }
    };
    visit(intent.lines, false);
  });

export const checkoutPricingLocationSchema = z
  .object({
    countryCode: countryCodeSchema,
    provinceCode: z.string().trim().min(1).nullable(),
    postalCode: z.string().trim().min(1).nullable(),
  })
  .strict();

export const checkoutPricingDestinationIntentSchema = z
  .object({
    destinationId: identifierSchema,
    location: checkoutPricingLocationSchema,
    lineIds: collection(identifierSchema),
  })
  .strict();

export const checkoutPricingCartIntentSchema = z
  .object({
    lines: collection(checkoutCartLineIntentSchema),
    discountCodes: collection(z.string().trim().min(1).max(256)),
    destinations: collection(checkoutPricingDestinationIntentSchema),
    attributes: checkoutPipelineJsonObjectSchema,
  })
  .strict()
  .superRefine((intent, context) => {
    const visit = (
      lines: readonly CheckoutCartLineIntent[],
      nested: boolean,
    ): void => {
      for (const line of lines) {
        if (nested !== (line.componentSelection !== null)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["lines"],
            message: nested
              ? `Nested pricing line ${line.lineId} requires componentSelection`
              : `Root pricing line ${line.lineId} cannot have componentSelection`,
          });
        }
        visit(line.children, true);
      }
    };
    visit(intent.lines, false);
  });

export const checkoutMerchandiseSnapshotSchema = z
  .object({
    variantId: identifierSchema,
    revision: revisionSchema,
    title: z.string().min(1),
    sku: z.string().nullable(),
    imageUrl: z.string().url().nullable(),
    isPhysical: z.boolean(),
    targeting: z
      .object({
        productId: identifierSchema,
        categoryIds: collection(identifierSchema),
        tagIds: collection(identifierSchema),
        featureIds: collection(identifierSchema),
        optionValueIds: collection(identifierSchema),
      })
      .strict(),
    data: checkoutPipelineJsonObjectSchema.nullable(),
  })
  .strict();

export const checkoutLineAvailabilitySchema = z
  .object({
    available: z.boolean(),
    maxQuantity: nonNegativeIntegerSchema.nullable(),
    continueSellingWhenOutOfStock: z.boolean(),
    reasonCode: identifierSchema.nullable(),
    revision: revisionSchema,
  })
  .strict()
  .superRefine((availability, context) => {
    if (availability.available === (availability.reasonCode !== null)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reasonCode"],
        message: "reasonCode must be present exactly when a line is unavailable",
      });
    }
    if (
      availability.continueSellingWhenOutOfStock &&
      (!availability.available || availability.maxQuantity !== null)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["continueSellingWhenOutOfStock"],
        message:
          "Continue-selling availability must be available and unbounded",
      });
    }
    if (!availability.available && availability.maxQuantity === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["maxQuantity"],
        message: "Unavailable tracked line must expose its maximum quantity",
      });
    }
  });

export const checkoutDiscountSourceSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("NATIVE") }).strict(),
  z
    .object({
      kind: z.literal("FUNCTION"),
      functionBindingId: identifierSchema,
      implementationId: identifierSchema,
      functionTarget: identifierSchema,
      executionId: identifierSchema,
      planRevision: revisionSchema,
    })
    .strict(),
]);

export const checkoutDiscountCodeReferenceSchema = z
  .object({
    codeId: identifierSchema,
    inputCode: z.string().trim().min(1).max(256),
    normalizedCode: z.string().trim().min(1).max(256),
  })
  .strict();

export const checkoutDiscountAllocationSchema = z.discriminatedUnion(
  "targetType",
  [
    z
      .object({
        targetType: z.literal("LINE"),
        lineId: identifierSchema,
        quantity: positiveIntegerSchema.nullable(),
        amount: checkoutPipelineNonNegativeMoneySchema,
      })
      .strict(),
    z
      .object({
        targetType: z.literal("DELIVERY_GROUP"),
        groupId: identifierSchema,
        amount: checkoutPipelineNonNegativeMoneySchema,
      })
      .strict(),
  ],
);

export const checkoutDiscountApplicationSchema = z
  .object({
    applicationId: identifierSchema,
    discountId: identifierSchema,
    configurationRevision: revisionSchema,
    discountClass: z.enum(["PRODUCT", "ORDER", "SHIPPING"]),
    method: z.enum(["AUTOMATIC", "CODE"]),
    code: checkoutDiscountCodeReferenceSchema.nullable(),
    source: checkoutDiscountSourceSchema,
    title: z.string().min(1),
    priority: nonNegativeIntegerSchema,
    amount: checkoutPipelineNonNegativeMoneySchema,
    allocations: collection(checkoutDiscountAllocationSchema),
    metadata: checkoutPipelineJsonObjectSchema.nullable(),
  })
  .strict();

export const checkoutLineDiscountAllocationSchema = z
  .object({
    applicationId: identifierSchema,
    amount: checkoutPipelineNonNegativeMoneySchema,
    quantity: positiveIntegerSchema.nullable(),
  })
  .strict();

const discountCodeRejectionReasonSchema = z.enum([
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
]);

export const checkoutDiscountCodeResolutionSchema = z.discriminatedUnion(
  "status",
  [
    z
      .object({
        inputCode: z.string().trim().min(1).max(256),
        normalizedCode: z.string().trim().min(1).max(256),
        status: z.literal("APPLIED"),
        discountId: identifierSchema,
        codeId: identifierSchema,
        applicationIds: collection(identifierSchema).min(1),
      })
      .strict(),
    z
      .object({
        inputCode: z.string().trim().min(1).max(256),
        normalizedCode: z.string().trim().min(1).max(256),
        status: z.literal("PENDING"),
        discountId: identifierSchema,
        codeId: identifierSchema,
        reason: z.literal("AWAITING_DELIVERY"),
      })
      .strict(),
    z
      .object({
        inputCode: z.string().trim().min(1).max(256),
        normalizedCode: z.string().trim().min(1).max(256),
        status: z.literal("REJECTED"),
        discountId: identifierSchema.nullable(),
        codeId: identifierSchema.nullable(),
        reason: discountCodeRejectionReasonSchema,
        message: z.string().min(1),
        retryable: z.boolean(),
      })
      .strict(),
  ],
);

export const checkoutDiscountUsageRequirementSchema = z
  .object({
    applicationId: identifierSchema,
    discountId: identifierSchema,
    codeId: identifierSchema.nullable(),
    customerId: identifierSchema.nullable(),
    configurationRevision: revisionSchema,
    usageCounterRevision: revisionSchema,
    reservationRequired: z.boolean(),
  })
  .strict();

function createQuotedLineSchema(
  remainingDepth: number,
): z.ZodType<CheckoutQuotedLine> {
  const childrenSchema =
    remainingDepth === 1
      ? z.array(z.never()).max(0)
      : collection(createQuotedLineSchema(remainingDepth - 1));
  return z
    .object({
      lineId: identifierSchema,
      contributesToTotals: z.boolean(),
      quantity: positiveIntegerSchema,
      purchase: checkoutLinePurchaseIntentSchema,
      merchandise: checkoutMerchandiseSnapshotSchema,
      availability: checkoutLineAvailabilitySchema,
      unitPrice: checkoutPipelineNonNegativeMoneySchema,
      originalUnitPrice: checkoutPipelineNonNegativeMoneySchema,
      compareAtUnitPrice: checkoutPipelineNonNegativeMoneySchema.nullable(),
      subtotal: checkoutPipelineNonNegativeMoneySchema,
      total: checkoutPipelineNonNegativeMoneySchema,
      discountAllocations: collection(checkoutLineDiscountAllocationSchema),
      children: childrenSchema,
    })
    .strict();
}

export const checkoutQuotedLineSchema = createQuotedLineSchema(
  CHECKOUT_PIPELINE_MAX_LINE_NESTING_DEPTH,
);

export const checkoutTransformedLineLineageSchema = z
  .object({
    lineId: identifierSchema,
    sourceLineIds: collection(identifierSchema).min(1),
  })
  .strict();

export const checkoutSourceLineResolutionSchema = z.discriminatedUnion(
  "status",
  [
    z
      .object({
        sourceLineId: identifierSchema,
        status: z.literal("TRANSFORMED"),
        transformedLineIds: collection(identifierSchema).min(1),
      })
      .strict(),
    z
      .object({
        sourceLineId: identifierSchema,
        status: z.literal("REMOVED"),
        reason: z
          .object({
            code: identifierSchema,
            message: z.string().min(1),
          })
          .strict(),
      })
      .strict(),
  ],
);

export const checkoutCanonicalDeliveryDestinationSchema = z
  .object({
    destinationId: identifierSchema,
    location: checkoutPricingLocationSchema,
    transformedLineIds: collection(identifierSchema),
  })
  .strict();

export const checkoutCanonicalDeliveryIntentSchema = z
  .object({
    revision: revisionSchema,
    lineage: collection(checkoutTransformedLineLineageSchema),
    destinations: collection(checkoutCanonicalDeliveryDestinationSchema),
    unassignedPhysicalLineIds: collection(identifierSchema),
  })
  .strict();

export const checkoutPreliminaryPricingTotalsSchema = z
  .object({
    merchandiseSubtotal: checkoutPipelineNonNegativeMoneySchema,
    merchandiseDiscountTotal: checkoutPipelineNonNegativeMoneySchema,
    merchandiseTotal: checkoutPipelineNonNegativeMoneySchema,
  })
  .strict();

export const checkoutPricingTotalsSchema = z
  .object({
    merchandiseSubtotal: checkoutPipelineNonNegativeMoneySchema,
    merchandiseDiscountTotal: checkoutPipelineNonNegativeMoneySchema,
    merchandiseTotal: checkoutPipelineNonNegativeMoneySchema,
    taxTotal: checkoutPipelineNonNegativeMoneySchema,
    deliverySubtotal: checkoutPipelineNonNegativeMoneySchema,
    deliveryDiscountTotal: checkoutPipelineNonNegativeMoneySchema,
    deliveryTotal: checkoutPipelineNonNegativeMoneySchema,
    payableTotal: checkoutPipelineNonNegativeMoneySchema,
  })
  .strict();

export const calculatePreliminaryPricingRequestSchema = z
  .object({
    context: checkoutPipelineEligibilityContextSchema,
    cartIntent: checkoutPricingCartIntentSchema,
  })
  .strict();

export const calculatePreliminaryPricingResultSchema = z
  .object({
    ...checkoutPipelineStageProvenanceSchema.shape,
    preliminaryQuoteId: identifierSchema,
    revision: revisionSchema,
    discountEvaluationRevision: revisionSchema,
    transformedLines: collection(checkoutQuotedLineSchema),
    sourceLineResolutions: collection(checkoutSourceLineResolutionSchema),
    deliveryIntent: checkoutCanonicalDeliveryIntentSchema,
    merchandiseRevision: revisionSchema,
    availabilityRevision: revisionSchema,
    appliedDiscounts: collection(checkoutDiscountApplicationSchema),
    discountCodeResolutions: collection(checkoutDiscountCodeResolutionSchema),
    usageRequirements: collection(checkoutDiscountUsageRequirementSchema),
    preliminaryTotals: checkoutPreliminaryPricingTotalsSchema,
  })
  .strict();

const checkoutDeliveryCustomerInputContractSchema = z
  .object({
    schemaDialect: z.literal("https://json-schema.org/draft/2020-12/schema"),
    schema: checkoutPipelineJsonObjectSchema,
    schemaHash: revisionSchema,
    schemaPolicyRevision: revisionSchema,
  })
  .strict()
  .superRefine((value, context) => {
    const visit = (entry: unknown, path: (string | number)[]): void => {
      if (Array.isArray(entry)) {
        entry.forEach((child, index) => visit(child, [...path, index]));
        return;
      }
      if (entry === null || typeof entry !== "object") {
        return;
      }
      Object.entries(entry).forEach(([key, child]) => {
        if (
          (key === "$ref" || key === "$dynamicRef") &&
          typeof child === "string" &&
          !child.startsWith("#")
        ) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["schema", ...path, key],
            message: "Customer input schemas may use only local references",
          });
        }
        visit(child, [...path, key]);
      });
    };
    visit(value.schema, []);
  });

const checkoutDeliveryOptionBaseShape = {
  handle: identifierSchema,
  profileId: identifierSchema,
  methodDefinitionId: identifierSchema,
  code: identifierSchema,
  title: z.string().min(1),
  description: z.string().min(1).nullable(),
  deliveryMethodType: z.enum([
    "LOCAL",
    "NONE",
    "PICK_UP",
    "PICKUP_POINT",
    "RETAIL",
    "SHIPPING",
  ]),
  cost: checkoutPipelineNonNegativeMoneySchema,
  estimatedMinDeliveryAt: timestampSchema.nullable(),
  estimatedMaxDeliveryAt: timestampSchema.nullable(),
  phoneRequired: z.boolean(),
  customerInputContract: checkoutDeliveryCustomerInputContractSchema.nullable(),
  publicData: checkoutPipelineJsonObjectSchema,
};

export const checkoutDeliveryOptionSchema = z.discriminatedUnion("source", [
  z
    .object({
      ...checkoutDeliveryOptionBaseShape,
      source: z.literal("MANUAL"),
      carrier: z.null(),
    })
    .strict(),
  z
    .object({
      ...checkoutDeliveryOptionBaseShape,
      source: z.literal("CARRIER_SERVICE"),
      carrier: z
        .object({
          code: identifierSchema,
        })
        .strict(),
    })
    .strict(),
]);

export const checkoutDeliveryOptionSelectionResolutionSchema =
  z.discriminatedUnion("status", [
    z.object({ status: z.literal("NONE") }).strict(),
    z
      .object({
        status: z.literal("SELECTED"),
        optionHandle: identifierSchema,
        customerInput: checkoutPipelineJsonObjectSchema.nullable(),
      })
      .strict(),
    z
      .object({
        status: z.literal("RESET"),
        previousOptionHandle: identifierSchema,
        customerInput: checkoutPipelineJsonObjectSchema.nullable(),
        reason: z
          .object({ code: identifierSchema, message: z.string().min(1) })
          .strict(),
      })
      .strict(),
  ]);

export const checkoutDeliveryGroupSchema = z
  .object({
    groupId: identifierSchema,
    destinationId: identifierSchema,
    lineIds: collection(identifierSchema),
    options: collection(checkoutDeliveryOptionSchema),
    selection: checkoutDeliveryOptionSelectionResolutionSchema,
  })
  .strict();

export const checkoutOrphanedDeliverySelectionResetSchema = z
  .object({
    groupId: identifierSchema,
    previousOptionHandle: identifierSchema,
    customerInput: checkoutPipelineJsonObjectSchema.nullable(),
    reason: z
      .object({ code: identifierSchema, message: z.string().min(1) })
      .strict(),
  })
  .strict();

export const calculateDeliveryOptionsRequestSchema = z
  .object({
    context: checkoutPipelineStageContextSchema,
    preliminary: calculatePreliminaryPricingResultSchema,
    destinations: collection(checkoutDeliveryDestinationIntentSchema),
    selections: collection(checkoutDeliveryOptionSelectionIntentSchema),
  })
  .strict();

export const checkoutPricingDeliveryOptionSchema = z
  .object({
    handle: identifierSchema,
    code: identifierSchema,
    carrierCode: identifierSchema.nullable(),
    deliveryMethodType: z.enum([
      "LOCAL",
      "NONE",
      "PICK_UP",
      "PICKUP_POINT",
      "RETAIL",
      "SHIPPING",
    ]),
    cost: checkoutPipelineNonNegativeMoneySchema,
  })
  .strict();

export const checkoutPricingDeliveryGroupSchema = z
  .object({
    groupId: identifierSchema,
    lineIds: collection(identifierSchema),
    options: collection(checkoutPricingDeliveryOptionSchema),
    selectedOptionHandle: identifierSchema.nullable(),
  })
  .strict();

export const checkoutPricingDeliverySnapshotSchema = z
  .object({
    ...checkoutPipelineStageProvenanceSchema.shape,
    revision: revisionSchema,
    basedOnPreliminaryRevision: revisionSchema,
    groups: collection(checkoutPricingDeliveryGroupSchema),
  })
  .strict();

export const calculateDeliveryOptionsResultSchema = z
  .object({
    ...checkoutPipelineStageProvenanceSchema.shape,
    revision: revisionSchema,
    basedOnPreliminaryRevision: revisionSchema,
    ratePlanRevision: revisionSchema,
    eligibilityRevision: revisionSchema,
    customizationRevision: revisionSchema,
    customizationPolicyRevision: revisionSchema,
    groups: collection(checkoutDeliveryGroupSchema),
    orphanedSelectionResets: collection(
      checkoutOrphanedDeliverySelectionResetSchema,
    ),
    carrierServiceExecutions: collection(
      z
        .object({
          groupId: identifierSchema,
          carrierServiceAccountId: identifierSchema,
          executionPolicyRevision: revisionSchema,
          route: z
            .object({
              protocolVersion: z.literal(1),
              capability: z.literal("delivery.carrier-service"),
              capabilityRouteId: identifierSchema,
              installationId: identifierSchema,
              appCode: identifierSchema,
              appVersion: identifierSchema,
              operation: z.literal("quoteRates"),
              routeRevision: revisionSchema,
            })
            .strict(),
          status: z.enum([
            "SUCCEEDED",
            "NO_SERVICE",
            "FAILED",
            "TIMED_OUT",
            "BACKUP_RATE_APPLIED",
          ]),
          rateCount: z.number().int().nonnegative(),
          durationMs: z.number().int().nonnegative(),
          attemptCount: z.number().int().nonnegative().max(1),
          rateSource: z.enum([
            "CARRIER_SERVICE_LIVE",
            "CARRIER_SERVICE_CACHE",
            "BACKUP_RATE",
          ]),
          startedAt: timestampSchema,
          completedAt: timestampSchema,
          failure: z
            .object({
              category: z.enum([
                "INVALID_REQUEST",
                "NOT_SUPPORTED",
                "NO_SERVICE",
                "CONFIGURATION",
                "AUTHENTICATION",
                "PROVIDER_UNAVAILABLE",
                "TIMEOUT",
                "RATE_LIMITED",
                "CONFLICT",
                "REJECTED",
                "UNKNOWN",
              ]),
              code: identifierSchema,
              message: z.string().min(1),
              retryable: z.boolean(),
              acceptedByProvider: z.boolean(),
              carrierCode: identifierSchema.nullable(),
            })
            .strict()
            .nullable(),
        })
        .strict(),
    ),
    issues: collection(
      z
        .object({
          severity: z.enum(["WARNING", "ERROR"]),
          code: identifierSchema,
          message: z.string().min(1),
          groupId: identifierSchema.nullable(),
          carrierServiceAccountId: identifierSchema.nullable(),
          retryable: z.boolean(),
        })
        .strict(),
    ),
  })
  .strict()
  .superRefine((value, context) => {
    const groupIds = new Set(value.groups.map(({ groupId }) => groupId));
    const executionKeys = new Set<string>();

    value.carrierServiceExecutions.forEach((execution, index) => {
      if (!groupIds.has(execution.groupId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["carrierServiceExecutions", index, "groupId"],
          message: "Provider execution references an unknown delivery group",
        });
      }

      const executionKey = [
        execution.groupId,
        execution.carrierServiceAccountId,
        execution.route.capabilityRouteId,
        execution.route.routeRevision,
      ].join(":");
      if (executionKeys.has(executionKey)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["carrierServiceExecutions", index],
          message: "Provider execution must be unique within one delivery result",
        });
      }
      executionKeys.add(executionKey);

      if (Date.parse(execution.completedAt) < Date.parse(execution.startedAt)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["carrierServiceExecutions", index, "completedAt"],
          message: "Provider execution cannot complete before it starts",
        });
      }
      const measuredDuration =
        Date.parse(execution.completedAt) - Date.parse(execution.startedAt);
      if (Math.abs(measuredDuration - execution.durationMs) > 1_000) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["carrierServiceExecutions", index, "durationMs"],
          message: "Provider execution duration disagrees with its timestamps",
        });
      }
      if (
        execution.rateSource === "CARRIER_SERVICE_CACHE" &&
        execution.attemptCount !== 0
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["carrierServiceExecutions", index, "attemptCount"],
          message: "A cache hit cannot report a provider attempt",
        });
      }
      if (
        execution.rateSource === "CARRIER_SERVICE_CACHE" &&
        execution.status !== "SUCCEEDED" &&
        execution.status !== "NO_SERVICE"
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["carrierServiceExecutions", index, "rateSource"],
          message: "Cached provider data can only produce success or no-service",
        });
      }
      if (
        execution.rateSource === "CARRIER_SERVICE_LIVE" &&
        execution.attemptCount === 0
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["carrierServiceExecutions", index, "attemptCount"],
          message: "A live provider result requires at least one attempt",
        });
      }

      if (execution.status === "SUCCEEDED") {
        if (execution.failure !== null || execution.rateCount === 0) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["carrierServiceExecutions", index],
            message: "A successful provider execution requires rates and forbids failure",
          });
        }
        return;
      }

      if (execution.status === "BACKUP_RATE_APPLIED") {
        if (
          execution.failure === null ||
          execution.rateCount === 0 ||
          execution.rateSource !== "BACKUP_RATE" ||
          !new Set<string>([
            "PROVIDER_UNAVAILABLE",
            "TIMEOUT",
            "RATE_LIMITED",
          ]).has(execution.failure.category)
        ) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["carrierServiceExecutions", index],
            message: "A backup rate requires an eligible carrier-service failure",
          });
        }
        return;
      }

      if (execution.rateSource === "BACKUP_RATE") {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["carrierServiceExecutions", index, "rateSource"],
          message: "Backup rate source requires BACKUP_RATE_APPLIED status",
        });
      }

      if (execution.rateCount !== 0) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["carrierServiceExecutions", index, "rateCount"],
          message: "An unsuccessful provider execution cannot report rates",
        });
      }
      if (
        execution.status === "NO_SERVICE" &&
        execution.failure !== null &&
        execution.failure.category !== "NO_SERVICE"
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["carrierServiceExecutions", index, "failure", "category"],
          message: "NO_SERVICE status requires a matching failure category",
        });
      }
      if (
        (execution.status === "FAILED" || execution.status === "TIMED_OUT") &&
        execution.failure === null
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["carrierServiceExecutions", index, "failure"],
          message: "Failed and timed-out executions require failure details",
        });
      }
      if (
        execution.status === "TIMED_OUT" &&
        execution.failure?.category !== "TIMEOUT"
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["carrierServiceExecutions", index, "failure", "category"],
          message: "TIMED_OUT status requires the TIMEOUT failure category",
        });
      }
    });

    value.issues.forEach((issue, index) => {
      if (issue.groupId !== null && !groupIds.has(issue.groupId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["issues", index, "groupId"],
          message: "Delivery issue references an unknown delivery group",
        });
      }
    });
  });

export const finalizePricingQuoteRequestSchema = z
  .object({
    context: checkoutPipelineEligibilityContextSchema,
    preliminary: calculatePreliminaryPricingResultSchema,
    delivery: checkoutPricingDeliverySnapshotSchema,
  })
  .strict();

export const finalizePricingQuoteResultSchema = z
  .object({
    ...checkoutPipelineStageProvenanceSchema.shape,
    quoteId: identifierSchema,
    revision: revisionSchema,
    discountEvaluationRevision: revisionSchema,
    basedOnPreliminaryDiscountEvaluationRevision: revisionSchema,
    basedOnPreliminaryRevision: revisionSchema,
    basedOnDeliveryRevision: revisionSchema,
    lines: collection(checkoutQuotedLineSchema),
    appliedDiscounts: collection(checkoutDiscountApplicationSchema),
    discountCodeResolutions: collection(checkoutDiscountCodeResolutionSchema),
    usageRequirements: collection(checkoutDiscountUsageRequirementSchema),
    totals: checkoutPricingTotalsSchema,
  })
  .strict();

export const checkoutPaymentMethodSchema = z
  .object({
    handle: identifierSchema,
    code: identifierSchema,
    title: z.string().min(1),
    provider: identifierSchema,
    flow: z.enum(["ONLINE", "OFFLINE", "ON_DELIVERY"]),
    metadata: checkoutPipelineJsonObjectSchema.nullable(),
  })
  .strict();

export const checkoutPaymentMethodSelectionResolutionSchema =
  z.discriminatedUnion("status", [
    z.object({ status: z.literal("NONE") }).strict(),
    z
      .object({
        status: z.literal("SELECTED"),
        methodHandle: identifierSchema,
        customerInput: checkoutPipelineJsonObjectSchema.nullable(),
      })
      .strict(),
    z
      .object({
        status: z.literal("RESET"),
        previousMethodHandle: identifierSchema,
        customerInput: checkoutPipelineJsonObjectSchema.nullable(),
        reason: z
          .object({ code: identifierSchema, message: z.string().min(1) })
          .strict(),
      })
      .strict(),
  ]);

export const checkoutPaymentDestinationSnapshotSchema = z
  .object({
    destinationId: identifierSchema,
    location: checkoutPricingLocationSchema,
  })
  .strict();

export const checkoutPaymentDeliveryGroupSnapshotSchema = z
  .object({
    groupId: identifierSchema,
    destinationId: identifierSchema,
    lineIds: collection(identifierSchema),
    selectedOption: checkoutPricingDeliveryOptionSchema.nullable(),
  })
  .strict();

export const checkoutPaymentDeliverySnapshotSchema = z
  .object({
    ...checkoutPipelineStageProvenanceSchema.shape,
    revision: revisionSchema,
    basedOnPreliminaryRevision: revisionSchema,
    destinations: collection(checkoutPaymentDestinationSnapshotSchema),
    groups: collection(checkoutPaymentDeliveryGroupSnapshotSchema),
  })
  .strict();

export const getAvailablePaymentMethodsRequestSchema = z
  .object({
    context: checkoutPipelineEligibilityContextSchema,
    selection: checkoutPaymentMethodSelectionIntentSchema.nullable(),
    finalQuote: finalizePricingQuoteResultSchema,
    delivery: checkoutPaymentDeliverySnapshotSchema,
  })
  .strict();

export const getAvailablePaymentMethodsResultSchema = z
  .object({
    ...checkoutPipelineStageProvenanceSchema.shape,
    revision: revisionSchema,
    basedOnFinalQuoteRevision: revisionSchema,
    basedOnDeliveryRevision: revisionSchema,
    methods: collection(checkoutPaymentMethodSchema),
    selection: checkoutPaymentMethodSelectionResolutionSchema,
  })
  .strict();

export const checkoutValidationOperationSchema = z
  .object({
    code: identifierSchema,
    message: z.string().min(1),
    severity: z.enum(["WARNING", "ERROR"]),
    field: collection(z.string().min(1).max(256)),
    lineId: identifierSchema.nullable(),
  })
  .strict();

export const validateCheckoutRequestSchema = z
  .object({
    context: checkoutPipelineExecutionContextSchema,
    cartIntent: checkoutCartIntentSchema,
    preliminary: calculatePreliminaryPricingResultSchema,
    delivery: calculateDeliveryOptionsResultSchema,
    finalQuote: finalizePricingQuoteResultSchema,
    payment: getAvailablePaymentMethodsResultSchema,
  })
  .strict();

export const validateCheckoutResultSchema = z
  .object({
    ...checkoutPipelineStageProvenanceSchema.shape,
    revision: revisionSchema,
    basedOnFinalQuoteRevision: revisionSchema,
    basedOnPaymentRevision: revisionSchema,
    valid: z.boolean(),
    operations: collection(checkoutValidationOperationSchema),
  })
  .strict()
  .superRefine((result, context) => {
    const expectedValid = !result.operations.some(
      ({ severity }) => severity === "ERROR",
    );
    if (result.valid !== expectedValid) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["valid"],
        message: "valid must be true iff validation has no ERROR operations",
      });
    }
  });

export const checkoutPipelineChangeSchema = z.enum([
  "CREATE",
  "LINES_ADD",
  "LINES_UPDATE",
  "LINES_DELETE",
  "LINES_REPLACE",
  "DISCOUNT_CODES_UPDATE",
  "BUYER_UPDATE",
  "BUYER_ELIGIBILITY_UPDATE",
  "CHANNEL_UPDATE",
  "CURRENCY_UPDATE",
  "DELIVERY_ADDRESS_UPDATE",
  "DELIVERY_OPTION_UPDATE",
  "PAYMENT_METHOD_UPDATE",
]);

export const checkoutRecalculationRequestSchema = z
  .object({
    context: checkoutPipelineExecutionContextSchema,
    change: checkoutPipelineChangeSchema,
    cartIntent: checkoutCartIntentSchema,
  })
  .strict();

export const checkoutPipelineStageOutcomeSchema = <
  TStage extends z.infer<typeof checkoutPipelineStageSchema>,
  T extends z.ZodTypeAny,
>(
  stage: TStage,
  dataSchema: T,
) =>
  z.discriminatedUnion("status", [
    z
      .object({
        status: z.literal("SUCCESS"),
        data: dataSchema,
        issues: collection(checkoutPipelineIssueSchema),
        trace: checkoutPipelineStageTraceSchema.extend({
          stage: z.literal(stage),
          status: z.literal("SUCCESS"),
        }),
      })
      .strict(),
    z
      .object({
        status: z.literal("FAILED"),
        failure: z
          .object({
            code: identifierSchema,
            message: z.string().min(1),
            retryable: z.boolean(),
          })
          .strict(),
        issues: collection(checkoutPipelineIssueSchema),
        trace: checkoutPipelineStageTraceSchema.extend({
          stage: z.literal(stage),
          status: z.literal("FAILED"),
        }),
      })
      .strict(),
    z
      .object({
        status: z.literal("SKIPPED"),
        reason: z
          .object({
            code: identifierSchema,
            message: z.string().min(1),
            upstreamStage: checkoutPipelineStageSchema.optional(),
          })
          .strict(),
        issues: collection(checkoutPipelineIssueSchema),
        trace: checkoutPipelineStageTraceSchema.extend({
          stage: z.literal(stage),
          status: z.literal("SKIPPED"),
        }),
      })
      .strict(),
  ]);

export const checkoutRecalculationResultSchema = z
  .object({
    executionId: identifierSchema,
    checkoutId: identifierSchema,
    basedOnCheckoutVersion: checkoutVersionSchema,
    resultRevision: revisionSchema,
    preliminaryPricing: checkoutPipelineStageOutcomeSchema(
      "PRICING_PRELIMINARY",
      calculatePreliminaryPricingResultSchema,
    ),
    delivery: checkoutPipelineStageOutcomeSchema(
      "DELIVERY",
      calculateDeliveryOptionsResultSchema,
    ),
    finalPricing: checkoutPipelineStageOutcomeSchema(
      "PRICING_FINAL",
      finalizePricingQuoteResultSchema,
    ),
    payment: checkoutPipelineStageOutcomeSchema(
      "PAYMENT",
      getAvailablePaymentMethodsResultSchema,
    ),
    validation: checkoutPipelineStageOutcomeSchema(
      "VALIDATION",
      validateCheckoutResultSchema,
    ),
    issues: collection(checkoutPipelineIssueSchema),
    trace: checkoutPipelineExecutionTraceSchema,
  })
  .strict();

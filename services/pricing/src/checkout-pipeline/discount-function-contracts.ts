import type { Pricing } from "@shopana/broker-types";
import { CURRENCY_CODES, LOCALE_CODES } from "@shopana/shared-references";
import { z } from "zod";

export const PricingDiscountFunctionTargets = {
  lines: "cart.lines.discounts.generate.run",
  deliveryOptions: "cart.delivery-options.discounts.generate.run",
} as const;

export type PricingDiscountFunctionTarget =
  (typeof PricingDiscountFunctionTargets)[keyof typeof PricingDiscountFunctionTargets];

export type PricingDiscountFunctionBindingStatus = "ACTIVE" | "DISABLED";
export type PricingDiscountFunctionFailureMode = "REQUIRED" | "OPTIONAL";

/**
 * Pricing owns this binding. Apps owns only installation/manifest route state.
 * A route existing in Apps must never activate a discount by itself.
 */
export interface PricingDiscountFunctionBinding {
  id: string;
  storeId: string;
  discountId: string;
  target: PricingDiscountFunctionTarget;
  installationId: string;
  functionKey: string;
  precedence: number;
  activationSequence: number;
  status: PricingDiscountFunctionBindingStatus;
  failureMode: PricingDiscountFunctionFailureMode;
  configurationSnapshot: Pricing.PricingCheckoutJsonValue;
}

export type PricingDiscountCalculationStrategy =
  | Readonly<{
      type: "NATIVE";
      ruleKind: "AMOUNT_OFF_PRODUCTS" | "BUY_X_GET_Y" | "AMOUNT_OFF_ORDER" | "FREE_SHIPPING";
    }>
  | Readonly<{
      type: "FUNCTION";
      binding: PricingDiscountFunctionBinding;
    }>;

export interface PricingDiscountFunctionBindingPort {
  /** Load active Pricing-owned bindings in stable execution order. */
  listActive(
    input: Readonly<{
      storeId: string;
      target: PricingDiscountFunctionTarget;
      discountIds: readonly string[];
    }>,
  ): Promise<Readonly<{ bindings: readonly PricingDiscountFunctionBinding[] }>>;
}

export interface PricingDiscountOwnerResolutionPort {
  resolveLineOwners(
    input: PricingLineDiscountFunctionInput,
  ): Promise<readonly PricingResolvedDiscountOwnerSnapshot[]>;

  resolveDeliveryOwners(
    input: PricingDeliveryDiscountFunctionInput,
  ): Promise<readonly PricingResolvedDiscountOwnerSnapshot[]>;
}

const identifierSchema = z.string().trim().min(1).max(256);
const currencyCodeSchema = z.enum(CURRENCY_CODES as [string, ...string[]]);
const localeCodeSchema = z.enum(LOCALE_CODES as [string, ...string[]]);
const moneySchema = z
  .object({
    amountMinor: z.string().regex(/^\d+$/),
    currencyCode: currencyCodeSchema,
  })
  .strict();
const identifiersSchema = z.array(identifierSchema).max(500);

export const pricingDiscountFunctionContextSchema = z
  .object({
    storeId: identifierSchema,
    checkoutId: identifierSchema,
    currencyCode: currencyCodeSchema,
    localeCode: localeCodeSchema.nullable(),
    channelCode: identifierSchema,
    effectiveAt: z.string().datetime({ offset: true }),
    buyer: z
      .object({
        customerId: identifierSchema.nullable(),
        countryCode: z
          .string()
          .regex(/^[A-Z]{2}$/)
          .nullable(),
        marketId: identifierSchema.nullable(),
        companyId: identifierSchema.nullable(),
        segmentIds: identifiersSchema,
      })
      .strict()
      .nullable(),
  })
  .strict()
  .superRefine(({ buyer }, context) => {
    if (buyer !== null && buyer.customerId === null && buyer.segmentIds.length > 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["buyer", "segmentIds"],
        message: "Guest buyer cannot have customer segment membership",
      });
    }
  });

export const pricingDiscountFunctionLineSchema = z
  .object({
    lineId: identifierSchema,
    quantity: z.number().int().safe().positive(),
    purchaseType: z.enum(["ONE_TIME", "SUBSCRIPTION"]),
    sellingPlanId: identifierSchema.nullable(),
    merchandise: z
      .object({
        variantId: identifierSchema,
        productId: identifierSchema,
        categoryIds: identifiersSchema,
        tagIds: identifiersSchema,
        featureIds: identifiersSchema,
        optionValueIds: identifiersSchema,
      })
      .strict(),
    unitPrice: moneySchema,
    subtotal: moneySchema,
  })
  .strict()
  .superRefine((line, context) => {
    if (line.purchaseType === "ONE_TIME" && line.sellingPlanId !== null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sellingPlanId"],
        message: "ONE_TIME purchase must not specify a selling plan",
      });
    }
    if (line.purchaseType === "SUBSCRIPTION" && line.sellingPlanId === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sellingPlanId"],
        message: "SUBSCRIPTION purchase must specify a selling plan",
      });
    }
  });

/** Canonical common input supplied to every active line discount binding. */
export const pricingLineDiscountFunctionInputSchema = z
  .object({
    context: pricingDiscountFunctionContextSchema,
    lines: z.array(pricingDiscountFunctionLineSchema).max(250),
    discountCodes: z.array(z.string().trim().min(1).max(256)).max(500),
    merchandiseSubtotal: moneySchema,
  })
  .strict();

const adjustmentValueSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("PERCENTAGE"),
      percentageBps: z.number().int().min(1).max(10_000),
    })
    .strict(),
  z
    .object({
      type: z.literal("FIXED_AMOUNT"),
      amount: moneySchema,
    })
    .strict(),
]);

export const pricingLineDiscountCandidateSchema = z.discriminatedUnion("discountClass", [
  z
    .object({
      candidateId: identifierSchema,
      discountClass: z.literal("PRODUCT"),
      title: z.string().trim().min(1).max(255),
      targets: z.object({ type: z.literal("LINES"), lineIds: identifiersSchema.min(1) }).strict(),
      value: adjustmentValueSchema,
      allocationMethod: z.enum(["EACH", "ACROSS"]),
      maximumDiscount: moneySchema.nullable(),
    })
    .strict(),
  z
    .object({
      candidateId: identifierSchema,
      discountClass: z.literal("ORDER"),
      title: z.string().trim().min(1).max(255),
      targets: z.object({ type: z.literal("ORDER") }).strict(),
      value: adjustmentValueSchema,
      allocationMethod: z.literal("ACROSS"),
      maximumDiscount: moneySchema.nullable(),
    })
    .strict(),
]);

export const pricingLineDiscountFunctionOutputSchema = z
  .object({
    candidates: z.array(pricingLineDiscountCandidateSchema).max(500),
  })
  .strict();

export const pricingDeliveryDiscountFunctionInputSchema = z
  .object({
    context: pricingDiscountFunctionContextSchema,
    merchandiseTotal: moneySchema,
    groups: z
      .array(
        z
          .object({
            groupId: identifierSchema,
            lineIds: identifiersSchema,
            selectedOption: z
              .object({
                handle: identifierSchema,
                code: identifierSchema,
                providerCode: identifierSchema,
                cost: moneySchema,
              })
              .strict()
              .nullable(),
          })
          .strict(),
      )
      .max(500),
    discountCodes: z.array(z.string().trim().min(1).max(256)).max(500),
  })
  .strict();

export const pricingDeliveryDiscountCandidateSchema = z
  .object({
    candidateId: identifierSchema,
    discountClass: z.literal("SHIPPING"),
    title: z.string().trim().min(1).max(255),
    groupIds: identifiersSchema.min(1),
    value: z.union([adjustmentValueSchema, z.object({ type: z.literal("FREE") }).strict()]),
    maximumShippingPrice: moneySchema.nullable(),
  })
  .strict();

export const pricingDeliveryDiscountFunctionOutputSchema = z
  .object({
    candidates: z.array(pricingDeliveryDiscountCandidateSchema).max(500),
  })
  .strict();

export type PricingLineDiscountFunctionInput = z.infer<
  typeof pricingLineDiscountFunctionInputSchema
>;
export type PricingLineDiscountCandidate = z.infer<typeof pricingLineDiscountCandidateSchema>;
export type PricingLineDiscountFunctionOutput = z.infer<
  typeof pricingLineDiscountFunctionOutputSchema
>;
export type PricingDeliveryDiscountFunctionInput = z.infer<
  typeof pricingDeliveryDiscountFunctionInputSchema
>;
export type PricingDeliveryDiscountCandidate = z.infer<
  typeof pricingDeliveryDiscountCandidateSchema
>;
export type PricingDeliveryDiscountFunctionOutput = z.infer<
  typeof pricingDeliveryDiscountFunctionOutputSchema
>;

export interface PricingDiscountFunctionRunnerPort {
  runLineDiscounts(
    input: PricingLineDiscountFunctionInput,
  ): Promise<readonly PricingLineDiscountCandidateEnvelope[]>;

  runDeliveryDiscounts(
    input: PricingDeliveryDiscountFunctionInput,
  ): Promise<readonly PricingDeliveryDiscountCandidateEnvelope[]>;
}

export interface PricingDiscountApplicatorPort {
  applyLineCandidates(
    input: Readonly<{
      functionInput: PricingLineDiscountFunctionInput;
      candidates: readonly PricingLineDiscountCandidateEnvelope[];
    }>,
  ): Promise<PricingLineDiscountApplicationResult>;

  applyDeliveryCandidates(
    input: Readonly<{
      functionInput: PricingDeliveryDiscountFunctionInput;
      candidates: readonly PricingDeliveryDiscountCandidateEnvelope[];
    }>,
  ): Promise<PricingDeliveryDiscountApplicationResult>;
}

export interface PricingResolvedDiscountOwnerSnapshot {
  discountId: string;
  discountClass: Pricing.PricingCheckoutDiscountClass;
  method: Pricing.PricingCheckoutDiscountMethod;
  code: Pricing.PricingCheckoutDiscountCodeReference | null;
  title: string;
  priority: number;
  calculationStrategy: PricingDiscountCalculationStrategy;
  combinesWith: readonly Pricing.PricingCheckoutDiscountClass[];
  usage: Readonly<{
    aggregateLimit: string | null;
    codeLimit: string | null;
    appliesOncePerCustomer: boolean;
    consumedAggregate: string;
    consumedCode: string | null;
  }>;
}

export interface PricingFunctionCandidateProvenance {
  implementationId: string;
  functionBindingId: string | null;
  functionTarget: PricingDiscountFunctionTarget;
  executionId: string;
}

export interface PricingLineDiscountCandidateEnvelope {
  owner: PricingResolvedDiscountOwnerSnapshot;
  provenance: PricingFunctionCandidateProvenance;
  candidate: PricingLineDiscountCandidate;
}

export interface PricingDeliveryDiscountCandidateEnvelope {
  owner: PricingResolvedDiscountOwnerSnapshot;
  provenance: PricingFunctionCandidateProvenance;
  candidate: PricingDeliveryDiscountCandidate;
}

export interface PricingLineDiscountApplicationResult {
  appliedDiscounts: readonly Pricing.PricingCheckoutDiscountApplication[];
  lineAllocations: Readonly<
    Record<string, readonly Pricing.PricingCheckoutLineDiscountAllocation[]>
  >;
  codeResolutions: readonly Pricing.PricingCheckoutDiscountCodeResolution[];
  usageRequirements: readonly Pricing.PricingCheckoutDiscountUsageRequirement[];
}

export interface PricingDeliveryDiscountApplicationResult {
  appliedDiscounts: readonly Pricing.PricingCheckoutDiscountApplication[];
  codeResolutions: readonly Pricing.PricingCheckoutDiscountCodeResolution[];
  usageRequirements: readonly Pricing.PricingCheckoutDiscountUsageRequirement[];
  deliveryDiscountTotal: Pricing.PricingCheckoutMoney;
}

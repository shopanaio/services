import { CommerceFunctionExecutionError } from "@shopana/function-runner";
import { z } from "zod";

import type {
  CheckoutNativeValidationRule,
  CheckoutPipelineJsonValue,
  CheckoutValidationBinding,
  CheckoutValidationBindingSource,
  CheckoutValidationFunctionInput,
  CheckoutValidationFunctionOperation,
  CheckoutValidationFunctionOutput,
  CheckoutValidationOperation,
  ValidateCheckoutRequest,
  ValidateCheckoutResult,
} from "./contracts/index.js";
import {
  CHECKOUT_VALIDATION_FUNCTION_TARGET,
} from "./contracts/index.js";
import { CheckoutPipelineBoundaryError, parseValidateCheckoutRequest } from "./boundaries.js";
import { canonicalJsonSha256 } from "./canonicalJson.js";
import { CheckoutPipelineStageError } from "./CheckoutPipelineStageError.js";
import {
  CHECKOUT_PIPELINE_MAX_COLLECTION_ITEMS,
  checkoutPipelineJsonObjectSchema,
  checkoutPipelineJsonValueSchema,
} from "./schemas.js";

export const EMPTY_CHECKOUT_VALIDATION_BINDING_SET_REVISION =
  "checkout-validation-bindings:empty:v1";

export const CHECKOUT_VALIDATION_FUNCTION_TARGET_DEFINITION = {
  target: CHECKOUT_VALIDATION_FUNCTION_TARGET,
  owningService: "checkout",
  executionMode: "COLLECT_ALL",
  nativeImplementations: [],
  defaultTimeoutMs: 3_000,
  concurrencyLimit: 8,
  appFailureMode: "REQUIRED",
  allowMultipleAppImplementations: true,
  maxInputBytes: 1_048_576,
  maxOutputBytes: 1_048_576,
  maxEnvelopeDepth: 32,
  tracePolicy: { inputDigest: true, outputDigest: true },
} as const;

type FunctionErrorClass =
  | "ROUTE_UNAVAILABLE"
  | "DEADLINE_EXCEEDED"
  | "APP_RUNTIME_UNAVAILABLE"
  | "AUTHORIZATION_ERROR"
  | "IMPLEMENTATION_EXCEPTION"
  | "INVALID_IMPLEMENTATION_OUTPUT"
  | "OUTPUT_SIZE_LIMIT"
  | "DOMAIN_REJECTION";

const functionErrorClasses = new Set<FunctionErrorClass>([
  "ROUTE_UNAVAILABLE",
  "DEADLINE_EXCEEDED",
  "APP_RUNTIME_UNAVAILABLE",
  "AUTHORIZATION_ERROR",
  "IMPLEMENTATION_EXCEPTION",
  "INVALID_IMPLEMENTATION_OUTPUT",
  "OUTPUT_SIZE_LIMIT",
  "DOMAIN_REJECTION",
]);

interface CommerceFunctionTraceItem {
  readonly planIndex: number;
  readonly implementationId: string;
  readonly implementationType: "NATIVE" | "APP";
  readonly functionBindingId: string | null;
  readonly owner: { service: string; resourceType: string; resourceId: string };
  readonly configurationRevision: string | null;
  readonly precedence: number;
  readonly activationSequence: number;
  readonly failureMode: "REQUIRED" | "OPTIONAL" | "DISABLED";
  readonly status: "SUCCEEDED" | "FAILED" | "TIMED_OUT" | "SKIPPED";
  readonly errorClass?: FunctionErrorClass;
  readonly errorCode?: string;
}

interface CommerceFunctionRunEnvelope {
  readonly target: string;
  readonly outputs: readonly {
    readonly planIndex: number;
    readonly implementationId: string;
    readonly implementationType: "NATIVE" | "APP";
    readonly functionBindingId: string | null;
    readonly data: unknown;
  }[];
  readonly trace: {
    readonly executionId: string;
    readonly correlationId?: string;
    readonly storeId: string;
    readonly target: string;
    readonly owningService: string;
    readonly bindingSetRevision: string;
    readonly deadlineAt: string;
    readonly status: "SUCCEEDED" | "PARTIAL" | "FAILED";
    readonly implementations: readonly CommerceFunctionTraceItem[];
  };
}

export interface CommerceFunctionRunRequest {
  readonly storeId: string;
  readonly target: typeof CHECKOUT_VALIDATION_FUNCTION_TARGET;
  readonly bindings: readonly {
    readonly functionBindingId: string;
    readonly installationId: string;
    readonly functionKey: string;
    readonly owner: CheckoutValidationBinding["owner"];
    readonly configurationRevision: string;
    readonly configurationSnapshot: CheckoutPipelineJsonValue;
    readonly routeRevision: string;
    readonly precedence: number;
    readonly activationSequence: number;
    readonly failureMode: "REQUIRED" | "OPTIONAL";
  }[];
  readonly bindingSetRevision: string;
  readonly input: CheckoutValidationFunctionInput;
  readonly executionId: string;
  readonly correlationId: string;
  readonly deadlineAt: string;
}

export interface CommerceFunctionRunnerPort {
  run(request: CommerceFunctionRunRequest): Promise<CommerceFunctionRunEnvelope>;
}

const identifier = z.string().trim().min(1).max(256);
const timestamp = z.string().datetime({ offset: true });
const bindingSchema = z
  .object({
    functionBindingId: identifier,
    storeId: identifier,
    target: z.literal(CHECKOUT_VALIDATION_FUNCTION_TARGET),
    installationId: identifier,
    functionKey: identifier,
    owner: z
      .object({
        service: z.literal("checkout"),
        resourceType: identifier,
        resourceId: identifier,
      })
      .strict(),
    status: z.enum(["ACTIVE", "DISABLED"]),
    failureMode: z.enum(["REQUIRED", "OPTIONAL"]),
    configurationSnapshot: checkoutPipelineJsonValueSchema,
    configurationRevision: identifier,
    routeRevision: identifier,
    precedence: z.number().int().safe().nonnegative(),
    activationSequence: z.number().int().safe().nonnegative(),
  })
  .strict();

export const checkoutValidationFunctionOperationSchema = z
  .object({
    code: identifier,
    message: z.string().min(1).max(512),
    severity: z.enum(["WARNING", "ERROR"]),
    field: z.array(z.string().min(1).max(256)).max(CHECKOUT_PIPELINE_MAX_COLLECTION_ITEMS),
    lineId: identifier.nullable(),
  })
  .strict();

export const checkoutValidationFunctionOutputSchema = z
  .object({
    schemaVersion: z.literal(1),
    operations: z
      .array(checkoutValidationFunctionOperationSchema)
      .max(CHECKOUT_PIPELINE_MAX_COLLECTION_ITEMS),
  })
  .strict();

const functionMoneySchema = z
  .object({ amountMinor: z.string().regex(/^\d+$/), currencyCode: identifier })
  .strict();
const functionPurchaseSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("ONE_TIME"), sellingPlanId: z.null() }).strict(),
  z.object({ type: z.literal("SUBSCRIPTION"), sellingPlanId: identifier }).strict(),
]);
const functionReasonSchema = z
  .object({ code: identifier, message: z.string().min(1).max(512) })
  .strict();
const functionLocationSchema = z
  .object({
    countryCode: z.string(),
    provinceCode: z.string().nullable(),
    postalCode: z.string().nullable(),
  })
  .strict();
const functionCartLineSchema: z.ZodType = z.lazy(() =>
  z
    .object({
      lineId: identifier,
      variantId: identifier,
      componentSelection: z.object({ componentItemId: identifier }).strict().nullable(),
      quantity: z.number().int().positive(),
      purchase: functionPurchaseSchema,
      children: z.array(functionCartLineSchema).max(CHECKOUT_PIPELINE_MAX_COLLECTION_ITEMS),
    })
    .strict(),
);
const functionQuotedLineSchema: z.ZodType = z.lazy(() =>
  z
    .object({
      lineId: identifier,
      contributesToTotals: z.boolean(),
      quantity: z.number().int().positive(),
      purchase: functionPurchaseSchema,
      merchandise: z
        .object({
          variantId: identifier,
          revision: identifier,
          title: z.string().min(1),
          sku: z.string().nullable(),
          imageUrl: z.string().url().nullable(),
          isPhysical: z.boolean(),
          targeting: z
            .object({
              productId: identifier,
              categoryIds: z.array(identifier),
              tagIds: z.array(identifier),
              featureIds: z.array(identifier),
              optionValueIds: z.array(identifier),
            })
            .strict(),
        })
        .strict(),
      availability: z
        .object({
          available: z.boolean(),
          maxQuantity: z.number().int().nonnegative().nullable(),
          continueSellingWhenOutOfStock: z.boolean(),
          reasonCode: identifier.nullable(),
          revision: identifier,
        })
        .strict(),
      unitPrice: functionMoneySchema,
      originalUnitPrice: functionMoneySchema,
      compareAtUnitPrice: functionMoneySchema.nullable(),
      subtotal: functionMoneySchema,
      total: functionMoneySchema,
      discountAllocations: z
        .array(
          z
            .object({
              applicationId: identifier,
              amount: functionMoneySchema,
              quantity: z.number().int().positive().nullable(),
            })
            .strict(),
        )
        .max(CHECKOUT_PIPELINE_MAX_COLLECTION_ITEMS),
      children: z
        .array(functionQuotedLineSchema)
        .max(CHECKOUT_PIPELINE_MAX_COLLECTION_ITEMS),
    })
    .strict(),
);
const functionDiscountCodeReferenceSchema = z
  .object({
    codeId: identifier,
    inputCode: z.string().min(1),
    normalizedCode: z.string().min(1),
  })
  .strict();
const functionDiscountAllocationSchema = z.discriminatedUnion("targetType", [
  z
    .object({
      targetType: z.literal("LINE"),
      lineId: identifier,
      quantity: z.number().int().positive().nullable(),
      amount: functionMoneySchema,
    })
    .strict(),
  z
    .object({
      targetType: z.literal("DELIVERY_GROUP"),
      groupId: identifier,
      amount: functionMoneySchema,
    })
    .strict(),
]);
const functionDiscountApplicationSchema = z
  .object({
    applicationId: identifier,
    discountId: identifier,
    configurationRevision: identifier,
    discountClass: z.enum(["PRODUCT", "ORDER", "SHIPPING"]),
    method: z.enum(["AUTOMATIC", "CODE"]),
    code: functionDiscountCodeReferenceSchema.nullable(),
    source: z.discriminatedUnion("kind", [
      z.object({ kind: z.literal("NATIVE") }).strict(),
      z
        .object({
          kind: z.literal("FUNCTION"),
          functionBindingId: identifier,
          functionTarget: identifier,
        })
        .strict(),
    ]),
    title: z.string().min(1),
    priority: z.number().int().nonnegative(),
    amount: functionMoneySchema,
    allocations: z
      .array(functionDiscountAllocationSchema)
      .max(CHECKOUT_PIPELINE_MAX_COLLECTION_ITEMS),
  })
  .strict();
const functionSourceLineResolutionSchema = z.discriminatedUnion("status", [
  z
    .object({
      sourceLineId: identifier,
      status: z.literal("TRANSFORMED"),
      transformedLineIds: z
        .array(identifier)
        .max(CHECKOUT_PIPELINE_MAX_COLLECTION_ITEMS),
    })
    .strict(),
  z
    .object({
      sourceLineId: identifier,
      status: z.literal("REMOVED"),
      reason: functionReasonSchema,
    })
    .strict(),
]);
const functionDeliveryIntentSchema = z
  .object({
    revision: identifier,
    lineage: z
      .array(
        z
          .object({
            lineId: identifier,
            sourceLineIds: z
              .array(identifier)
              .max(CHECKOUT_PIPELINE_MAX_COLLECTION_ITEMS),
          })
          .strict(),
      )
      .max(CHECKOUT_PIPELINE_MAX_COLLECTION_ITEMS),
    destinations: z
      .array(
        z
          .object({
            destinationId: identifier,
            location: functionLocationSchema,
            transformedLineIds: z
              .array(identifier)
              .max(CHECKOUT_PIPELINE_MAX_COLLECTION_ITEMS),
          })
          .strict(),
      )
      .max(CHECKOUT_PIPELINE_MAX_COLLECTION_ITEMS),
    unassignedPhysicalLineIds: z
      .array(identifier)
      .max(CHECKOUT_PIPELINE_MAX_COLLECTION_ITEMS),
  })
  .strict();
const functionDiscountCodeResolutionSchema = z.discriminatedUnion("status", [
  z
    .object({
      inputCode: z.string().min(1),
      normalizedCode: z.string().min(1),
      status: z.literal("APPLIED"),
      discountId: identifier,
      codeId: identifier,
      applicationIds: z
        .array(identifier)
        .max(CHECKOUT_PIPELINE_MAX_COLLECTION_ITEMS),
    })
    .strict(),
  z
    .object({
      inputCode: z.string().min(1),
      normalizedCode: z.string().min(1),
      status: z.literal("PENDING"),
      discountId: identifier,
      codeId: identifier,
      reason: z.literal("AWAITING_DELIVERY"),
    })
    .strict(),
  z
    .object({
      inputCode: z.string().min(1),
      normalizedCode: z.string().min(1),
      status: z.literal("REJECTED"),
      discountId: identifier.nullable(),
      codeId: identifier.nullable(),
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
      message: z.string().min(1).max(512),
      retryable: z.boolean(),
    })
    .strict(),
]);
const functionPreliminaryTotalsSchema = z
  .object({
    merchandiseSubtotal: functionMoneySchema,
    merchandiseDiscountTotal: functionMoneySchema,
    merchandiseTotal: functionMoneySchema,
  })
  .strict();
const functionTotalsSchema = functionPreliminaryTotalsSchema.extend({
  taxTotal: functionMoneySchema,
  deliverySubtotal: functionMoneySchema,
  deliveryDiscountTotal: functionMoneySchema,
  deliveryTotal: functionMoneySchema,
  payableTotal: functionMoneySchema,
}).strict();
const functionDeliverySelectionSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("NONE") }).strict(),
  z
    .object({ status: z.literal("SELECTED"), optionHandle: identifier })
    .strict(),
  z
    .object({
      status: z.literal("RESET"),
      previousOptionHandle: identifier,
      reason: functionReasonSchema,
    })
    .strict(),
]);
const functionPaymentSelectionSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("NONE") }).strict(),
  z
    .object({ status: z.literal("SELECTED"), methodHandle: identifier })
    .strict(),
  z
    .object({
      status: z.literal("RESET"),
      previousMethodHandle: identifier,
      reason: functionReasonSchema,
    })
    .strict(),
]);

export const checkoutValidationFunctionInputSchema = z
  .object({
    schemaVersion: z.literal(1),
    context: z
      .object({
        checkoutId: identifier,
        storeId: identifier,
        basedOnCheckoutVersion: z.number().int().nonnegative(),
        currencyCode: identifier,
        localeCode: identifier.nullable(),
        channelCode: identifier,
        effectiveAt: z.string().datetime({ offset: true }),
        authenticated: z.boolean(),
        buyerEligibility: z
          .object({
            countryCode: z.string().nullable(),
            marketId: identifier.nullable(),
            companyId: identifier.nullable(),
            segmentIds: z.array(identifier),
            segmentMembershipRevision: identifier.nullable(),
          })
          .strict()
          .nullable(),
      })
      .strict(),
    cart: z
      .object({
        lines: z.array(functionCartLineSchema),
        discountCodes: z.array(z.string()),
        destinations: z.array(
          z
            .object({
              destinationId: identifier,
              location: functionLocationSchema,
              lineIds: z.array(identifier),
            })
            .strict(),
        ),
        selectedDeliveryOptions: z.array(
          z.object({ groupId: identifier, optionHandle: identifier }).strict(),
        ),
        selectedPaymentMethod: z.object({ methodHandle: identifier }).strict().nullable(),
      })
      .strict(),
    preliminary: z
      .object({
        checkoutId: identifier,
        basedOnCheckoutVersion: z.number().int().nonnegative(),
        currencyCode: identifier,
        preliminaryQuoteId: identifier,
        revision: identifier,
        discountEvaluationRevision: identifier,
        transformedLines: z.array(functionQuotedLineSchema),
        sourceLineResolutions: z
          .array(functionSourceLineResolutionSchema)
          .max(CHECKOUT_PIPELINE_MAX_COLLECTION_ITEMS),
        deliveryIntent: functionDeliveryIntentSchema,
        merchandiseRevision: identifier,
        availabilityRevision: identifier,
        appliedDiscounts: z.array(functionDiscountApplicationSchema),
        discountCodeResolutions: z
          .array(functionDiscountCodeResolutionSchema)
          .max(CHECKOUT_PIPELINE_MAX_COLLECTION_ITEMS),
        preliminaryTotals: functionPreliminaryTotalsSchema,
      })
      .strict(),
    delivery: z
      .object({
        checkoutId: identifier,
        basedOnCheckoutVersion: z.number().int().nonnegative(),
        currencyCode: identifier,
        revision: identifier,
        basedOnPreliminaryRevision: identifier,
        ratePlanRevision: identifier,
        eligibilityRevision: identifier,
        customizationRevision: identifier,
        customizationPolicyRevision: identifier,
        groups: z.array(
          z
            .object({
              groupId: identifier,
              destinationId: identifier,
              lineIds: z.array(identifier),
              options: z.array(
                z
                  .object({
                    handle: identifier,
                    code: identifier,
                    title: z.string().min(1),
                    description: z.string().nullable(),
                    deliveryMethodType: z.enum([
                      "LOCAL",
                      "NONE",
                      "PICK_UP",
                      "PICKUP_POINT",
                      "RETAIL",
                      "SHIPPING",
                    ]),
                    cost: functionMoneySchema,
                    estimatedMinDeliveryAt: z.string().nullable(),
                    estimatedMaxDeliveryAt: z.string().nullable(),
                    phoneRequired: z.boolean(),
                    customerInputContract: z
                      .object({
                        schemaDialect: z.literal(
                          "https://json-schema.org/draft/2020-12/schema",
                        ),
                        schema: checkoutPipelineJsonObjectSchema,
                        schemaHash: identifier,
                        schemaPolicyRevision: identifier,
                      })
                      .strict()
                      .nullable(),
                    publicData: checkoutPipelineJsonObjectSchema,
                    carrierCode: identifier.nullable(),
                  })
                  .strict(),
              ),
              selection: functionDeliverySelectionSchema,
            })
            .strict(),
        ),
        orphanedSelectionResets: z
          .array(
            z
              .object({
                groupId: identifier,
                previousOptionHandle: identifier,
                reason: functionReasonSchema,
              })
              .strict(),
          )
          .max(CHECKOUT_PIPELINE_MAX_COLLECTION_ITEMS),
      })
      .strict(),
    finalQuote: z
      .object({
        checkoutId: identifier,
        basedOnCheckoutVersion: z.number().int().nonnegative(),
        currencyCode: identifier,
        quoteId: identifier,
        revision: identifier,
        discountEvaluationRevision: identifier,
        basedOnPreliminaryDiscountEvaluationRevision: identifier,
        basedOnPreliminaryRevision: identifier,
        basedOnDeliveryRevision: identifier,
        lines: z.array(functionQuotedLineSchema),
        appliedDiscounts: z.array(functionDiscountApplicationSchema),
        discountCodeResolutions: z
          .array(functionDiscountCodeResolutionSchema)
          .max(CHECKOUT_PIPELINE_MAX_COLLECTION_ITEMS),
        totals: functionTotalsSchema,
      })
      .strict(),
    payment: z
      .object({
        checkoutId: identifier,
        basedOnCheckoutVersion: z.number().int().nonnegative(),
        currencyCode: identifier,
        revision: identifier,
        basedOnFinalQuoteRevision: identifier,
        basedOnDeliveryRevision: identifier,
        methods: z.array(
          z
            .object({
              handle: identifier,
              code: identifier,
              title: z.string().min(1),
              provider: identifier,
              flow: z.enum(["ONLINE", "OFFLINE", "ON_DELIVERY"]),
            })
            .strict(),
        ),
        selection: functionPaymentSelectionSchema,
      })
      .strict(),
  })
  .strict();

const functionFailureMap: Record<FunctionErrorClass, [string, string, boolean]> = {
  ROUTE_UNAVAILABLE: ["CHECKOUT_VALIDATION_FUNCTION_ROUTE_UNAVAILABLE", "A required checkout validation function is unavailable.", true],
  DEADLINE_EXCEEDED: ["CHECKOUT_VALIDATION_FUNCTION_DEADLINE_EXCEEDED", "A required checkout validation function exceeded its deadline.", true],
  APP_RUNTIME_UNAVAILABLE: ["CHECKOUT_VALIDATION_FUNCTION_RUNTIME_UNAVAILABLE", "A required checkout validation function could not be executed.", true],
  AUTHORIZATION_ERROR: ["CHECKOUT_VALIDATION_FUNCTION_AUTHORIZATION_FAILED", "A required checkout validation function is not authorized.", false],
  IMPLEMENTATION_EXCEPTION: ["CHECKOUT_VALIDATION_FUNCTION_FAILED", "A required checkout validation function failed.", false],
  INVALID_IMPLEMENTATION_OUTPUT: ["CHECKOUT_VALIDATION_FUNCTION_OUTPUT_INVALID", "A required checkout validation function returned an invalid result.", false],
  OUTPUT_SIZE_LIMIT: ["CHECKOUT_VALIDATION_FUNCTION_OUTPUT_TOO_LARGE", "A required checkout validation function returned too much data.", false],
  DOMAIN_REJECTION: ["CHECKOUT_VALIDATION_FUNCTION_REJECTED", "A required checkout validation function rejected the request.", false],
};

function boundaryFailure(cause: unknown): CheckoutPipelineStageError {
  return new CheckoutPipelineStageError({
    code: "CHECKOUT_VALIDATION_FUNCTION_OUTPUT_INVALID",
    message: "A required checkout validation function returned an invalid result.",
    retryable: false,
    cause,
  });
}

function pipelineBoundaryFailure(cause: unknown): CheckoutPipelineStageError {
  return new CheckoutPipelineStageError({
    code: "CHECKOUT_PIPELINE_BOUNDARY_VIOLATION",
    message: "Checkout pipeline received an invalid boundary payload.",
    retryable: false,
    cause,
  });
}

function requiredFunctionFailure(
  errorClass: FunctionErrorClass | undefined,
  cause?: unknown,
): CheckoutPipelineStageError {
  const mapped: [string, string, boolean] =
    errorClass === undefined
      ? ["CHECKOUT_VALIDATION_FUNCTION_FAILED", "A required checkout validation function failed.", false]
      : functionFailureMap[errorClass];
  const [code, message, retryable] = mapped;
  return new CheckoutPipelineStageError({ code, message, retryable, cause });
}

function nativeOperation(
  rule: CheckoutNativeValidationRule,
  message: string,
  field: readonly string[],
  lineId: string | null = null,
): CheckoutValidationOperation {
  return {
    code: rule,
    message,
    severity: "ERROR",
    field,
    lineId,
    source: { type: "NATIVE", rule },
  };
}

function flattenLines<T extends { children: readonly T[] }>(lines: readonly T[]): T[] {
  const flattened: T[] = [];
  const visit = (entries: readonly T[]): void => {
    for (const entry of entries) {
      flattened.push(entry);
      visit(entry.children);
    }
  };
  visit(lines);
  return flattened;
}

export function createNativeCheckoutValidationOperations(
  request: ValidateCheckoutRequest,
): readonly CheckoutValidationOperation[] {
  const lines = flattenLines(request.finalQuote.lines);
  const operations: CheckoutValidationOperation[] = [];
  if (lines.length === 0) {
    operations.push(nativeOperation("CART_EMPTY", "Cart must contain at least one line.", ["cart", "lines"]));
  }
  for (const line of lines) {
    if (!line.availability.available) {
      operations.push(nativeOperation("LINE_UNAVAILABLE", "Cart line is unavailable.", ["cart", "lines"], line.lineId));
    }
  }
  for (const line of lines) {
    if (line.availability.maxQuantity !== null && line.quantity > line.availability.maxQuantity) {
      operations.push(nativeOperation("LINE_QUANTITY_EXCEEDED", "Cart line quantity exceeds the available quantity.", ["cart", "lines"], line.lineId));
    }
  }
  for (const lineId of request.preliminary.deliveryIntent.unassignedPhysicalLineIds) {
    operations.push(nativeOperation("DELIVERY_ADDRESS_REQUIRED", "A delivery address is required for this cart line.", ["delivery", "destinations"], lineId));
  }
  for (const group of request.delivery.groups) {
    if (group.options.length === 0) {
      operations.push(nativeOperation("DELIVERY_OPTIONS_UNAVAILABLE", "No delivery options are available for this delivery group.", ["delivery", "groups", group.groupId, "options"]));
    }
  }
  for (const group of request.delivery.groups) {
    if (group.options.length > 0 && group.selection.status === "NONE") {
      operations.push(nativeOperation("DELIVERY_OPTION_REQUIRED", "A delivery option must be selected for this delivery group.", ["delivery", "groups", group.groupId, "selectedOption"]));
    }
  }
  for (const group of request.delivery.groups) {
    if (group.selection.status === "RESET") {
      operations.push(nativeOperation("DELIVERY_OPTION_INVALID", "The selected delivery option is no longer valid.", ["delivery", "groups", group.groupId, "selectedOption"]));
    }
  }
  for (const reset of request.delivery.orphanedSelectionResets) {
    operations.push(nativeOperation("DELIVERY_OPTION_ORPHANED", "The selected delivery option no longer belongs to a delivery group.", ["delivery", "selectedOptions", reset.groupId]));
  }
  const paymentRequired = BigInt(request.payableAmount.amountMinor) > 0n;
  if (paymentRequired && request.payment.methods.length === 0) {
    operations.push(nativeOperation("PAYMENT_METHODS_UNAVAILABLE", "No payment methods are available for this checkout.", ["payment", "methods"]));
  }
  if (paymentRequired && request.payment.methods.length > 0 && request.payment.selection.status === "NONE") {
    operations.push(nativeOperation("PAYMENT_METHOD_REQUIRED", "A payment method must be selected.", ["payment", "selectedMethod"]));
  }
  if (paymentRequired && request.payment.selection.status === "RESET") {
    operations.push(nativeOperation("PAYMENT_METHOD_INVALID", "The selected payment method is no longer valid.", ["payment", "selectedMethod"]));
  }
  return operations;
}

function projectCartLine(line: ValidateCheckoutRequest["cartIntent"]["lines"][number]): Record<string, unknown> {
  return {
    lineId: line.lineId,
    variantId: line.variantId,
    componentSelection: line.componentSelection === null ? null : { componentItemId: line.componentSelection.componentItemId },
    quantity: line.quantity,
    purchase: line.purchase.type === "ONE_TIME"
      ? { type: "ONE_TIME", sellingPlanId: null }
      : { type: "SUBSCRIPTION", sellingPlanId: line.purchase.sellingPlanId },
    children: line.children.map(projectCartLine),
  };
}

function projectQuotedLine(line: ValidateCheckoutRequest["finalQuote"]["lines"][number]): Record<string, unknown> {
  return {
    lineId: line.lineId,
    contributesToTotals: line.contributesToTotals,
    quantity: line.quantity,
    purchase: line.purchase,
    merchandise: {
      variantId: line.merchandise.variantId,
      revision: line.merchandise.revision,
      title: line.merchandise.title,
      sku: line.merchandise.sku,
      imageUrl: line.merchandise.imageUrl,
      isPhysical: line.merchandise.isPhysical,
      targeting: line.merchandise.targeting,
    },
    availability: line.availability,
    unitPrice: line.unitPrice,
    originalUnitPrice: line.originalUnitPrice,
    compareAtUnitPrice: line.compareAtUnitPrice,
    subtotal: line.subtotal,
    total: line.total,
    discountAllocations: line.discountAllocations,
    children: line.children.map(projectQuotedLine),
  };
}

function projectDiscountApplication(application: ValidateCheckoutRequest["finalQuote"]["appliedDiscounts"][number]): Record<string, unknown> {
  return {
    applicationId: application.applicationId,
    discountId: application.discountId,
    configurationRevision: application.configurationRevision,
    discountClass: application.discountClass,
    method: application.method,
    code: application.code,
    source: application.source.kind === "NATIVE"
      ? { kind: "NATIVE" }
      : {
          kind: "FUNCTION",
          functionBindingId: application.source.functionBindingId,
          functionTarget: application.source.functionTarget,
        },
    title: application.title,
    priority: application.priority,
    amount: application.amount,
    allocations: application.allocations,
  };
}

export function toCheckoutValidationFunctionInput(
  rawRequest: ValidateCheckoutRequest,
): CheckoutValidationFunctionInput {
  const request = parseValidateCheckoutRequest(rawRequest);
  const buyer = request.context.buyer;
  const preliminaryLines = request.preliminary.transformedLines.map(projectQuotedLine);
  const finalLines = request.finalQuote.lines.map(projectQuotedLine);
  const input = {
    schemaVersion: 1 as const,
    context: {
      checkoutId: request.context.checkoutId,
      storeId: request.context.storeId,
      basedOnCheckoutVersion: request.context.expectedCheckoutVersion,
      currencyCode: request.context.currencyCode,
      localeCode: request.context.localeCode,
      channelCode: request.context.channelCode,
      effectiveAt: request.context.effectiveAt,
      authenticated: buyer?.customerId !== null && buyer !== null,
      buyerEligibility: buyer === null ? null : {
        countryCode: buyer.countryCode,
        marketId: buyer.marketId,
        companyId: buyer.companyId,
        segmentIds: buyer.segmentIds,
        segmentMembershipRevision: buyer.segmentMembershipRevision,
      },
    },
    cart: {
      lines: request.cartIntent.lines.map(projectCartLine),
      discountCodes: request.cartIntent.discountCodes,
      destinations: request.cartIntent.destinations.map((destination) => ({
        destinationId: destination.destinationId,
        location: {
          countryCode: destination.address.countryCode,
          provinceCode: destination.address.provinceCode,
          postalCode: destination.address.postalCode,
        },
        lineIds: destination.lineIds,
      })),
      selectedDeliveryOptions: request.cartIntent.selectedDeliveryOptions.map((selection) => ({ groupId: selection.groupId, optionHandle: selection.optionHandle })),
      selectedPaymentMethod: request.cartIntent.selectedPaymentMethod === null ? null : { methodHandle: request.cartIntent.selectedPaymentMethod.methodHandle },
    },
    preliminary: {
      checkoutId: request.preliminary.checkoutId,
      basedOnCheckoutVersion: request.preliminary.basedOnCheckoutVersion,
      currencyCode: request.preliminary.currencyCode,
      preliminaryQuoteId: request.preliminary.preliminaryQuoteId,
      revision: request.preliminary.revision,
      discountEvaluationRevision: request.preliminary.discountEvaluationRevision,
      transformedLines: preliminaryLines,
      sourceLineResolutions: request.preliminary.sourceLineResolutions,
      deliveryIntent: request.preliminary.deliveryIntent,
      merchandiseRevision: request.preliminary.merchandiseRevision,
      availabilityRevision: request.preliminary.availabilityRevision,
      appliedDiscounts: request.preliminary.appliedDiscounts.map(projectDiscountApplication),
      discountCodeResolutions: request.preliminary.discountCodeResolutions,
      preliminaryTotals: request.preliminary.preliminaryTotals,
    },
    delivery: {
      checkoutId: request.delivery.checkoutId,
      basedOnCheckoutVersion: request.delivery.basedOnCheckoutVersion,
      currencyCode: request.delivery.currencyCode,
      revision: request.delivery.revision,
      basedOnPreliminaryRevision: request.delivery.basedOnPreliminaryRevision,
      ratePlanRevision: request.delivery.ratePlanRevision,
      eligibilityRevision: request.delivery.eligibilityRevision,
      customizationRevision: request.delivery.customizationRevision,
      customizationPolicyRevision: request.delivery.customizationPolicyRevision,
      groups: request.delivery.groups.map((group) => ({
        groupId: group.groupId,
        destinationId: group.destinationId,
        lineIds: group.lineIds,
        options: group.options.map((option) => ({
          handle: option.handle,
          code: option.code,
          title: option.title,
          description: option.description,
          deliveryMethodType: option.deliveryMethodType,
          cost: option.cost,
          estimatedMinDeliveryAt: option.estimatedMinDeliveryAt,
          estimatedMaxDeliveryAt: option.estimatedMaxDeliveryAt,
          phoneRequired: option.phoneRequired,
          customerInputContract: option.customerInputContract,
          publicData: option.publicData,
          carrierCode: option.carrier?.code ?? null,
        })),
        selection: group.selection.status === "SELECTED"
          ? { status: "SELECTED", optionHandle: group.selection.optionHandle }
          : group.selection.status === "RESET"
            ? { status: "RESET", previousOptionHandle: group.selection.previousOptionHandle, reason: group.selection.reason }
            : { status: "NONE" },
      })),
      orphanedSelectionResets: request.delivery.orphanedSelectionResets.map((reset) => ({ groupId: reset.groupId, previousOptionHandle: reset.previousOptionHandle, reason: reset.reason })),
    },
    finalQuote: {
      checkoutId: request.finalQuote.checkoutId,
      basedOnCheckoutVersion: request.finalQuote.basedOnCheckoutVersion,
      currencyCode: request.finalQuote.currencyCode,
      quoteId: request.finalQuote.quoteId,
      revision: request.finalQuote.revision,
      discountEvaluationRevision: request.finalQuote.discountEvaluationRevision,
      basedOnPreliminaryDiscountEvaluationRevision: request.finalQuote.basedOnPreliminaryDiscountEvaluationRevision,
      basedOnPreliminaryRevision: request.finalQuote.basedOnPreliminaryRevision,
      basedOnDeliveryRevision: request.finalQuote.basedOnDeliveryRevision,
      lines: finalLines,
      appliedDiscounts: request.finalQuote.appliedDiscounts.map(projectDiscountApplication),
      discountCodeResolutions: request.finalQuote.discountCodeResolutions,
      totals: request.finalQuote.totals,
    },
    payment: {
      checkoutId: request.payment.checkoutId,
      basedOnCheckoutVersion: request.payment.basedOnCheckoutVersion,
      currencyCode: request.payment.currencyCode,
      revision: request.payment.revision,
      basedOnFinalQuoteRevision: request.payment.basedOnFinalQuoteRevision,
      basedOnDeliveryRevision: request.payment.basedOnDeliveryRevision,
      methods: request.payment.methods.map(({ handle, code, title, provider, flow }) => ({ handle, code, title, provider, flow })),
      selection: request.payment.selection.status === "SELECTED"
        ? { status: "SELECTED", methodHandle: request.payment.selection.methodHandle }
        : request.payment.selection.status === "RESET"
          ? { status: "RESET", previousMethodHandle: request.payment.selection.previousMethodHandle, reason: request.payment.selection.reason }
          : { status: "NONE" },
    },
  };
  // The strict projection parser is the final PII boundary. Every field above
  // is constructed from the explicit V1 allowlist rather than copied wholesale.
  return checkoutValidationFunctionInputSchema.parse(input) as CheckoutValidationFunctionInput;
}

function parseBindings(raw: readonly unknown[], storeId: string): CheckoutValidationBinding[] {
  const bindings = raw.map((value) => bindingSchema.parse(value));
  const ids = new Set<string>();
  for (const binding of bindings) {
    if (
      binding.storeId !== storeId ||
      binding.owner.resourceType !== "store" ||
      binding.owner.resourceId !== storeId
    ) {
      throw new CheckoutPipelineBoundaryError("Checkout validation binding owner is invalid");
    }
    if (ids.has(binding.functionBindingId)) {
      throw new CheckoutPipelineBoundaryError("Checkout validation binding ID must be unique");
    }
    ids.add(binding.functionBindingId);
  }
  return bindings
    .filter(({ status }) => status === "ACTIVE")
    .sort((left, right) =>
      left.precedence - right.precedence ||
      left.activationSequence - right.activationSequence ||
      (left.functionBindingId < right.functionBindingId
        ? -1
        : left.functionBindingId > right.functionBindingId
          ? 1
          : 0),
    );
}

function bindingSetRevision(bindings: readonly CheckoutValidationBinding[], storeId: string): string {
  if (bindings.length === 0) return EMPTY_CHECKOUT_VALIDATION_BINDING_SET_REVISION;
  const payload = {
    schemaVersion: 1,
    storeId,
    target: CHECKOUT_VALIDATION_FUNCTION_TARGET,
    bindings: bindings.map(({ status: _status, storeId: _storeId, target: _target, ...binding }) => binding),
  };
  return `checkout-validation-bindings:v1:sha256:${canonicalJsonSha256(payload)}`;
}

function assertEnvelope(
  envelope: CommerceFunctionRunEnvelope,
  request: CommerceFunctionRunRequest,
  bindings: readonly CheckoutValidationBinding[],
  thrown: boolean,
): void {
  const trace = envelope.trace;
  if (
    envelope.target !== request.target ||
    trace.executionId !== request.executionId ||
    trace.correlationId !== request.correlationId ||
    trace.storeId !== request.storeId ||
    trace.target !== request.target ||
    trace.owningService !== CHECKOUT_VALIDATION_FUNCTION_TARGET_DEFINITION.owningService ||
    trace.bindingSetRevision !== request.bindingSetRevision ||
    !timestamp.safeParse(trace.deadlineAt).success ||
    Date.parse(trace.deadlineAt) > Date.parse(request.deadlineAt) ||
    trace.implementations.length !== bindings.length
  ) {
    throw new CheckoutPipelineBoundaryError("Commerce function envelope does not match its request");
  }
  const outputByIndex = new Map<number, CommerceFunctionRunEnvelope["outputs"][number]>();
  let previousOutputIndex = -1;
  for (const output of envelope.outputs) {
    if (output.planIndex <= previousOutputIndex || outputByIndex.has(output.planIndex)) {
      throw new CheckoutPipelineBoundaryError("Commerce function outputs are not in plan order");
    }
    previousOutputIndex = output.planIndex;
    outputByIndex.set(output.planIndex, output);
  }
  let firstRequiredFailure: CommerceFunctionTraceItem | undefined;
  for (let index = 0; index < bindings.length; index += 1) {
    const binding = bindings[index]!;
    const item = trace.implementations[index];
    if (
      item === undefined ||
      item.planIndex !== index ||
      item.implementationType !== "APP" ||
      item.implementationId !== `app:${binding.functionBindingId}` ||
      item.functionBindingId !== binding.functionBindingId ||
      JSON.stringify(item.owner) !== JSON.stringify(binding.owner) ||
      item.configurationRevision !== binding.configurationRevision ||
      item.precedence !== binding.precedence ||
      item.activationSequence !== binding.activationSequence ||
      item.failureMode !== binding.failureMode
    ) {
      throw new CheckoutPipelineBoundaryError("Commerce function trace does not match active bindings");
    }
    if (
      !new Set(["SUCCEEDED", "FAILED", "TIMED_OUT", "SKIPPED"]).has(item.status) ||
      (item.errorClass !== undefined && !functionErrorClasses.has(item.errorClass)) ||
      (item.errorCode !== undefined &&
        (typeof item.errorCode !== "string" || item.errorCode.length === 0))
    ) {
      throw new CheckoutPipelineBoundaryError("Commerce function trace contains an invalid status");
    }
    const output = outputByIndex.get(index);
    if (item.status === "SUCCEEDED") {
      if (
        output === undefined ||
        (
          (output.implementationId !== item.implementationId ||
            output.implementationType !== item.implementationType ||
            output.functionBindingId !== item.functionBindingId)
        )
      ) {
        throw new CheckoutPipelineBoundaryError("Successful function trace requires exactly one output");
      }
      if (output !== undefined) checkoutValidationFunctionOutputSchema.parse(output.data);
    } else if (output !== undefined) {
      throw new CheckoutPipelineBoundaryError("Unsuccessful function trace cannot contain output");
    }
    if ((item.status === "FAILED" || item.status === "TIMED_OUT") && item.failureMode === "REQUIRED" && firstRequiredFailure === undefined) {
      firstRequiredFailure = item;
    }
    if (item.status === "SKIPPED" && firstRequiredFailure === undefined) {
      throw new CheckoutPipelineBoundaryError("Function trace skipped before required failure");
    }
  }
  if (outputByIndex.size !== envelope.outputs.length || [...outputByIndex.keys()].some((index) => index < 0 || index >= bindings.length)) {
    throw new CheckoutPipelineBoundaryError("Commerce function envelope contains foreign outputs");
  }
  const failures = trace.implementations.filter(({ status }) => status === "FAILED" || status === "TIMED_OUT");
  if (thrown) {
    if (firstRequiredFailure === undefined || trace.status !== "FAILED") {
      throw new CheckoutPipelineBoundaryError("Thrown function trace has no required failure");
    }
  } else {
    if (firstRequiredFailure !== undefined || trace.status !== (failures.length === 0 ? "SUCCEEDED" : "PARTIAL")) {
      throw new CheckoutPipelineBoundaryError("Returned function trace status is incoherent");
    }
  }
}

function toFunctionOperations(
  envelope: CommerceFunctionRunEnvelope,
): CheckoutValidationOperation[] {
  const operations: CheckoutValidationOperation[] = [];
  for (const item of envelope.trace.implementations) {
    const source = {
      type: "FUNCTION" as const,
      target: CHECKOUT_VALIDATION_FUNCTION_TARGET,
      implementationId: item.implementationId,
      functionBindingId: item.functionBindingId!,
    };
    if (item.status === "SUCCEEDED") {
      const output = envelope.outputs.find(({ planIndex }) => planIndex === item.planIndex)!;
      const parsed: CheckoutValidationFunctionOutput = checkoutValidationFunctionOutputSchema.parse(output.data);
      operations.push(...parsed.operations.map((operation) => ({ ...operation, source })));
    } else if ((item.status === "FAILED" || item.status === "TIMED_OUT") && item.failureMode === "OPTIONAL") {
      operations.push({
        code: "OPTIONAL_VALIDATION_FUNCTION_FAILED",
        message: "An optional checkout validation function could not be evaluated.",
        severity: "WARNING",
        field: [],
        lineId: null,
        source,
      });
    }
  }
  return operations;
}

export class CheckoutValidationRunner {
  constructor(
    private readonly dependencies: {
      readonly functions: CommerceFunctionRunnerPort;
      readonly bindings: CheckoutValidationBindingSource;
    },
  ) {}

  async validate(rawRequest: ValidateCheckoutRequest): Promise<ValidateCheckoutResult> {
    const request = parseValidateCheckoutRequest(rawRequest);
    const native = createNativeCheckoutValidationOperations(request);
    let rawBindings: readonly unknown[];
    try {
      rawBindings = await this.dependencies.bindings.loadForTarget({
        storeId: request.context.storeId,
        target: CHECKOUT_VALIDATION_FUNCTION_TARGET,
      });
    } catch (cause) {
      throw new CheckoutPipelineStageError({
        code: "CHECKOUT_VALIDATION_BINDINGS_UNAVAILABLE",
        message: "Checkout validation configuration is unavailable.",
        retryable: true,
        cause,
      });
    }
    let bindings: CheckoutValidationBinding[];
    try {
      bindings = parseBindings(rawBindings, request.context.storeId);
    } catch (cause) {
      throw pipelineBoundaryFailure(cause);
    }
    const revision = bindingSetRevision(bindings, request.context.storeId);
    let functionOperations: CheckoutValidationOperation[] = [];
    if (bindings.length !== 0) {
      const runRequest: CommerceFunctionRunRequest = {
        storeId: request.context.storeId,
        target: CHECKOUT_VALIDATION_FUNCTION_TARGET,
        bindings: bindings.map(({ functionBindingId, installationId, functionKey, owner, configurationRevision, configurationSnapshot, routeRevision, precedence, activationSequence, failureMode }) => ({ functionBindingId, installationId, functionKey, owner, configurationRevision, configurationSnapshot, routeRevision, precedence, activationSequence, failureMode })),
        bindingSetRevision: revision,
        input: toCheckoutValidationFunctionInput(request),
        executionId: request.context.executionId,
        correlationId: request.context.correlationId,
        deadlineAt: request.context.deadlineAt,
      };
      let runnerReturned = false;
      try {
        const envelope = await this.dependencies.functions.run(runRequest);
        runnerReturned = true;
        assertEnvelope(envelope, runRequest, bindings, false);
        functionOperations = toFunctionOperations(envelope);
      } catch (cause) {
        if (runnerReturned) throw boundaryFailure(cause);
        if (cause instanceof CommerceFunctionExecutionError) {
          const envelope: CommerceFunctionRunEnvelope = {
            target: runRequest.target,
            outputs: cause.outputs,
            trace: cause.trace as CommerceFunctionRunEnvelope["trace"],
          };
          try {
            assertEnvelope(envelope, runRequest, bindings, true);
            const firstRequired = envelope.trace.implementations.find(
              (item) => (item.status === "FAILED" || item.status === "TIMED_OUT") && item.failureMode === "REQUIRED",
            );
            if (firstRequired?.errorClass !== cause.errorClass) {
              throw new CheckoutPipelineBoundaryError("Function error class does not match trace");
            }
            throw requiredFunctionFailure(firstRequired.errorClass, cause);
          } catch (validationCause) {
            if (validationCause instanceof CheckoutPipelineStageError) throw validationCause;
            throw boundaryFailure(validationCause);
          }
        }
        if (cause instanceof CheckoutPipelineStageError) throw cause;
        if (cause instanceof CheckoutPipelineBoundaryError || cause instanceof z.ZodError) {
          throw boundaryFailure(cause);
        }
        throw requiredFunctionFailure(undefined, cause);
      }
    }
    const operations = [...native, ...functionOperations];
    const revisionPayload = {
      schemaVersion: 1,
      checkoutId: request.context.checkoutId,
      basedOnCheckoutVersion: request.context.expectedCheckoutVersion,
      basedOnFinalQuoteRevision: request.finalQuote.revision,
      basedOnPaymentRevision: request.payment.revision,
      bindingSetRevision: revision,
      operations,
    };
    return {
      executionId: request.context.executionId,
      checkoutId: request.context.checkoutId,
      basedOnCheckoutVersion: request.context.expectedCheckoutVersion,
      currencyCode: request.context.currencyCode,
      revision: `checkout-validation:v1:sha256:${canonicalJsonSha256(revisionPayload)}`,
      basedOnFinalQuoteRevision: request.finalQuote.revision,
      basedOnPaymentRevision: request.payment.revision,
      bindingSetRevision: revision,
      valid: !operations.some(({ severity }) => severity === "ERROR"),
      operations,
    };
  }
}

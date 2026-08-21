import type { CheckoutPipelineJsonObject, CheckoutPipelineJsonValue } from "./common.js";
import type { ValidateCheckoutRequest } from "./validation.js";

export const CHECKOUT_VALIDATION_FUNCTION_TARGET = "cart.validations.generate.run" as const;

export interface CheckoutValidationBinding {
  readonly functionBindingId: string;
  readonly storeId: string;
  readonly target: typeof CHECKOUT_VALIDATION_FUNCTION_TARGET;
  readonly installationId: string;
  readonly functionKey: string;
  readonly owner: {
    readonly service: "checkout";
    readonly resourceType: string;
    readonly resourceId: string;
  };
  readonly status: "ACTIVE" | "DISABLED";
  readonly failureMode: "REQUIRED" | "OPTIONAL";
  readonly configurationSnapshot: CheckoutPipelineJsonValue;
  readonly configurationRevision: string;
  readonly routeRevision: string;
  readonly precedence: number;
  readonly activationSequence: number;
}

export interface CheckoutValidationBindingSource {
  loadForTarget(input: {
    readonly storeId: string;
    readonly target: typeof CHECKOUT_VALIDATION_FUNCTION_TARGET;
  }): Promise<readonly unknown[]>;
}

export interface CheckoutValidationFunctionMoney {
  readonly amountMinor: string;
  readonly currencyCode: string;
}

export type CheckoutValidationFunctionPurchase =
  | Readonly<{ type: "ONE_TIME"; sellingPlanId: null }>
  | Readonly<{ type: "SUBSCRIPTION"; sellingPlanId: string }>;

/** The explicit PII-minimized input passed to application functions. */
export interface CheckoutValidationFunctionInput {
  readonly schemaVersion: 1;
  readonly context: {
    readonly checkoutId: string;
    readonly storeId: string;
    readonly currencyCode: string;
    readonly localeCode: string | null;
    readonly channelCode: string;
    readonly effectiveAt: string;
    readonly authenticated: boolean;
    readonly buyerEligibility: null | {
      readonly countryCode: string | null;
      readonly marketId: string | null;
      readonly companyId: string | null;
      readonly segmentIds: readonly string[];
      readonly segmentMembershipRevision: string | null;
    };
  };
  readonly cart: CheckoutValidationFunctionCart;
  readonly preliminary: CheckoutValidationFunctionPreliminaryQuote;
  readonly delivery: CheckoutValidationFunctionDelivery;
  readonly finalQuote: CheckoutValidationFunctionFinalQuote;
  readonly payment: CheckoutValidationFunctionPayment;
}

export interface CheckoutValidationFunctionCart {
  readonly lines: readonly CheckoutValidationFunctionCartLine[];
  readonly discountCodes: readonly string[];
  readonly destinations: readonly {
    readonly destinationId: string;
    readonly location: {
      readonly countryCode: string;
      readonly provinceCode: string | null;
      readonly postalCode: string | null;
    };
    readonly lineIds: readonly string[];
  }[];
  readonly selectedDeliveryOptions: readonly {
    readonly groupId: string;
    readonly optionHandle: string;
  }[];
  readonly selectedPaymentMethod: null | { readonly methodHandle: string };
}

export interface CheckoutValidationFunctionCartLine {
  readonly lineId: string;
  readonly variantId: string;
  readonly componentSelection: null | { readonly componentItemId: string };
  readonly quantity: number;
  readonly purchase: CheckoutValidationFunctionPurchase;
  readonly children: readonly CheckoutValidationFunctionCartLine[];
}

export interface CheckoutValidationFunctionMerchandise {
  readonly variantId: string;
  readonly revision: string;
  readonly title: string;
  readonly sku: string | null;
  readonly imageUrl: string | null;
  readonly isPhysical: boolean;
  readonly targeting: {
    readonly productId: string;
    readonly categoryIds: readonly string[];
    readonly tagIds: readonly string[];
    readonly featureIds: readonly string[];
    readonly optionValueIds: readonly string[];
  };
}

export interface CheckoutValidationFunctionAvailability {
  readonly available: boolean;
  readonly maxQuantity: number | null;
  readonly continueSellingWhenOutOfStock: boolean;
  readonly reasonCode: string | null;
  readonly revision: string;
}

export interface CheckoutValidationFunctionLineDiscountAllocation {
  readonly applicationId: string;
  readonly amount: CheckoutValidationFunctionMoney;
  readonly quantity: number | null;
}

export interface CheckoutValidationFunctionQuotedLine {
  readonly lineId: string;
  readonly contributesToTotals: boolean;
  readonly quantity: number;
  readonly purchase: CheckoutValidationFunctionPurchase;
  readonly merchandise: CheckoutValidationFunctionMerchandise;
  readonly availability: CheckoutValidationFunctionAvailability;
  readonly unitPrice: CheckoutValidationFunctionMoney;
  readonly originalUnitPrice: CheckoutValidationFunctionMoney;
  readonly compareAtUnitPrice: CheckoutValidationFunctionMoney | null;
  readonly subtotal: CheckoutValidationFunctionMoney;
  readonly total: CheckoutValidationFunctionMoney;
  readonly discountAllocations: readonly CheckoutValidationFunctionLineDiscountAllocation[];
  readonly children: readonly CheckoutValidationFunctionQuotedLine[];
}

export type CheckoutValidationFunctionDiscountAllocation =
  | Readonly<{
      targetType: "LINE";
      lineId: string;
      quantity: number | null;
      amount: CheckoutValidationFunctionMoney;
    }>
  | Readonly<{
      targetType: "DELIVERY_GROUP";
      groupId: string;
      amount: CheckoutValidationFunctionMoney;
    }>;

export type CheckoutValidationFunctionDiscountSource =
  | Readonly<{ kind: "NATIVE" }>
  | Readonly<{
      kind: "FUNCTION";
      functionBindingId: string;
      functionTarget: string;
    }>;

export interface CheckoutValidationFunctionDiscountApplication {
  readonly applicationId: string;
  readonly discountId: string;
  readonly configurationRevision: string;
  readonly discountClass: "PRODUCT" | "ORDER" | "SHIPPING";
  readonly method: "AUTOMATIC" | "CODE";
  readonly code: null | {
    readonly codeId: string;
    readonly inputCode: string;
    readonly normalizedCode: string;
  };
  readonly source: CheckoutValidationFunctionDiscountSource;
  readonly title: string;
  readonly priority: number;
  readonly amount: CheckoutValidationFunctionMoney;
  readonly allocations: readonly CheckoutValidationFunctionDiscountAllocation[];
}

export type CheckoutValidationFunctionSourceLineResolution =
  | Readonly<{
      sourceLineId: string;
      status: "TRANSFORMED";
      transformedLineIds: readonly string[];
    }>
  | Readonly<{
      sourceLineId: string;
      status: "REMOVED";
      reason: Readonly<{ code: string; message: string }>;
    }>;

export interface CheckoutValidationFunctionDeliveryIntent {
  readonly revision: string;
  readonly lineage: readonly {
    readonly lineId: string;
    readonly sourceLineIds: readonly string[];
  }[];
  readonly destinations: readonly {
    readonly destinationId: string;
    readonly location: {
      readonly countryCode: string;
      readonly provinceCode: string | null;
      readonly postalCode: string | null;
    };
    readonly transformedLineIds: readonly string[];
  }[];
  readonly unassignedPhysicalLineIds: readonly string[];
}

export type CheckoutValidationFunctionDiscountCodeRejectionReason =
  | "NOT_FOUND"
  | "DISABLED"
  | "NOT_ACTIVE"
  | "CHANNEL_NOT_ELIGIBLE"
  | "PURCHASE_TYPE_NOT_ELIGIBLE"
  | "BUYER_NOT_ELIGIBLE"
  | "USAGE_LIMIT_REACHED"
  | "MINIMUM_REQUIREMENT_NOT_MET"
  | "TARGET_NOT_ELIGIBLE"
  | "COMBINATION_EXCLUDED"
  | "FUNCTION_FAILED"
  | "INVALID_FUNCTION_OUTPUT";

export type CheckoutValidationFunctionDiscountCodeResolution =
  | Readonly<{
      inputCode: string;
      normalizedCode: string;
      status: "APPLIED";
      discountId: string;
      codeId: string;
      applicationIds: readonly string[];
    }>
  | Readonly<{
      inputCode: string;
      normalizedCode: string;
      status: "PENDING";
      discountId: string;
      codeId: string;
      reason: "AWAITING_DELIVERY";
    }>
  | Readonly<{
      inputCode: string;
      normalizedCode: string;
      status: "REJECTED";
      discountId: string | null;
      codeId: string | null;
      reason: CheckoutValidationFunctionDiscountCodeRejectionReason;
      message: string;
      retryable: boolean;
    }>;

export interface CheckoutValidationFunctionPreliminaryTotals {
  readonly merchandiseSubtotal: CheckoutValidationFunctionMoney;
  readonly merchandiseDiscountTotal: CheckoutValidationFunctionMoney;
  readonly merchandiseTotal: CheckoutValidationFunctionMoney;
}

export interface CheckoutValidationFunctionTotals extends CheckoutValidationFunctionPreliminaryTotals {
  readonly taxTotal: CheckoutValidationFunctionMoney;
  readonly deliverySubtotal: CheckoutValidationFunctionMoney;
  readonly deliveryDiscountTotal: CheckoutValidationFunctionMoney;
  readonly deliveryTotal: CheckoutValidationFunctionMoney;
  readonly payableTotal: CheckoutValidationFunctionMoney;
}

export interface CheckoutValidationFunctionPreliminaryQuote {
  readonly checkoutId: string;
  readonly currencyCode: string;
  readonly preliminaryQuoteId: string;
  readonly revision: string;
  readonly discountEvaluationRevision: string;
  readonly transformedLines: readonly CheckoutValidationFunctionQuotedLine[];
  readonly sourceLineResolutions: readonly CheckoutValidationFunctionSourceLineResolution[];
  readonly deliveryIntent: CheckoutValidationFunctionDeliveryIntent;
  readonly merchandiseRevision: string;
  readonly availabilityRevision: string;
  readonly appliedDiscounts: readonly CheckoutValidationFunctionDiscountApplication[];
  readonly discountCodeResolutions: readonly CheckoutValidationFunctionDiscountCodeResolution[];
  readonly preliminaryTotals: CheckoutValidationFunctionPreliminaryTotals;
}

export interface CheckoutValidationFunctionDeliveryOption {
  readonly handle: string;
  readonly code: string;
  readonly title: string;
  readonly description: string | null;
  readonly deliveryMethodType:
    "LOCAL" | "NONE" | "PICK_UP" | "PICKUP_POINT" | "RETAIL" | "SHIPPING";
  readonly cost: CheckoutValidationFunctionMoney;
  readonly estimatedMinDeliveryAt: string | null;
  readonly estimatedMaxDeliveryAt: string | null;
  readonly phoneRequired: boolean;
  readonly customerInputContract: null | {
    readonly schemaDialect: "https://json-schema.org/draft/2020-12/schema";
    readonly schema: CheckoutPipelineJsonObject;
    readonly schemaHash: string;
    readonly schemaPolicyRevision: string;
  };
  readonly publicData: CheckoutPipelineJsonObject;
  readonly carrierCode: string | null;
}

export type CheckoutValidationFunctionDeliverySelection =
  | Readonly<{ status: "NONE" }>
  | Readonly<{ status: "SELECTED"; optionHandle: string }>
  | Readonly<{
      status: "RESET";
      previousOptionHandle: string;
      reason: Readonly<{ code: string; message: string }>;
    }>;

export interface CheckoutValidationFunctionDeliveryGroup {
  readonly groupId: string;
  readonly destinationId: string;
  readonly lineIds: readonly string[];
  readonly options: readonly CheckoutValidationFunctionDeliveryOption[];
  readonly selection: CheckoutValidationFunctionDeliverySelection;
}

export interface CheckoutValidationFunctionOrphanedSelectionReset {
  readonly groupId: string;
  readonly previousOptionHandle: string;
  readonly reason: Readonly<{ code: string; message: string }>;
}

export interface CheckoutValidationFunctionDelivery {
  readonly checkoutId: string;
  readonly currencyCode: string;
  readonly revision: string;
  readonly basedOnPreliminaryRevision: string;
  readonly ratePlanRevision: string;
  readonly eligibilityRevision: string;
  readonly customizationRevision: string;
  readonly customizationPolicyRevision: string;
  readonly groups: readonly CheckoutValidationFunctionDeliveryGroup[];
  readonly orphanedSelectionResets: readonly CheckoutValidationFunctionOrphanedSelectionReset[];
}

export interface CheckoutValidationFunctionFinalQuote {
  readonly checkoutId: string;
  readonly currencyCode: string;
  readonly quoteId: string;
  readonly revision: string;
  readonly discountEvaluationRevision: string;
  readonly basedOnPreliminaryDiscountEvaluationRevision: string;
  readonly basedOnPreliminaryRevision: string;
  readonly basedOnDeliveryRevision: string;
  readonly lines: readonly CheckoutValidationFunctionQuotedLine[];
  readonly appliedDiscounts: readonly CheckoutValidationFunctionDiscountApplication[];
  readonly discountCodeResolutions: readonly CheckoutValidationFunctionDiscountCodeResolution[];
  readonly totals: CheckoutValidationFunctionTotals;
}

export interface CheckoutValidationFunctionPaymentMethod {
  readonly handle: string;
  readonly code: string;
  readonly title: string;
  readonly provider: string;
  readonly flow: "ONLINE" | "OFFLINE" | "ON_DELIVERY";
}

export type CheckoutValidationFunctionPaymentSelection =
  | Readonly<{ status: "NONE" }>
  | Readonly<{ status: "SELECTED"; methodHandle: string }>
  | Readonly<{
      status: "RESET";
      previousMethodHandle: string;
      reason: Readonly<{ code: string; message: string }>;
    }>;

export interface CheckoutValidationFunctionPayment {
  readonly checkoutId: string;
  readonly currencyCode: string;
  readonly revision: string;
  readonly basedOnFinalQuoteRevision: string;
  readonly basedOnDeliveryRevision: string;
  readonly methods: readonly CheckoutValidationFunctionPaymentMethod[];
  readonly selection: CheckoutValidationFunctionPaymentSelection;
}

export type CheckoutValidationSnapshot = ValidateCheckoutRequest;

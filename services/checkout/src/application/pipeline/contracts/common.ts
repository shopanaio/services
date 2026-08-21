export type CheckoutPipelineStage =
  "PRICING_PRELIMINARY" | "DELIVERY" | "PRICING_FINAL" | "LOYALTY" | "PAYMENT" | "VALIDATION";

export type CheckoutPipelineStageStatus = "SUCCESS" | "FAILED" | "SKIPPED";

export type CheckoutPipelineJsonValue =
  | null
  | boolean
  | number
  | string
  | readonly CheckoutPipelineJsonValue[]
  | { readonly [key: string]: CheckoutPipelineJsonValue };

export type CheckoutPipelineJsonObject = Readonly<{
  [key: string]: CheckoutPipelineJsonValue;
}>;

export type CheckoutPipelineMoney = Readonly<{
  amountMinor: string;
  currencyCode: string;
}>;

export type CheckoutPipelineStageProvenance = Readonly<{
  executionId: string;
  checkoutId: string;
  currencyCode: string;
}>;

export type CheckoutPipelineBuyer = Readonly<{
  customerId: string | null;
  email: string | null;
  phone: string | null;
  countryCode: string | null;
  marketId: string | null;
  companyId: string | null;
  segmentIds: readonly string[];
  segmentMembershipRevision: string | null;
  data: CheckoutPipelineJsonObject | null;
}>;

/** Non-contact buyer facts used for pricing and payment eligibility rules. */
export type CheckoutBuyerEligibilityContext = Readonly<{
  customerId: string | null;
  countryCode: string | null;
  marketId: string | null;
  companyId: string | null;
  segmentIds: readonly string[];
  segmentMembershipRevision: string | null;
}>;

/**
 * Canonical PII snapshot passed only to stages that explicitly require
 * delivery identity/contact data. Implementations must not log this payload.
 */
export type CheckoutPipelineAddress = Readonly<{
  id: string;
  address1: string;
  address2: string | null;
  city: string;
  countryCode: string;
  provinceCode: string | null;
  provinceName: string | null;
  postalCode: string | null;
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  providerData: CheckoutPipelineJsonObject | null;
}>;

export type CheckoutPipelineIssue = Readonly<{
  stage: CheckoutPipelineStage;
  code: string;
  message: string;
  severity: "WARNING" | "ERROR";
  effect: "CONTINUE" | "STOP";
  field?: readonly string[];
  lineId?: string;
  retryable: boolean;
}>;

export type CheckoutPipelineStageTrace<
  TStage extends CheckoutPipelineStage = CheckoutPipelineStage,
  TStatus extends CheckoutPipelineStageStatus = CheckoutPipelineStageStatus,
> = Readonly<{
  stage: TStage;
  status: TStatus;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  /** Time at which the guarded port promise settled, when it was accepted. */
  resultObservedAt?: string;
  inputRevision?: string;
  outputRevision?: string;
}>;

export type CheckoutPipelineExecutionTrace = Readonly<{
  executionId: string;
  correlationId: string;
  startedAt: string;
  completedAt: string;
  deadlineAt: string;
  deadlineExceeded: boolean;
  deadlineObservedAt: string | null;
  stages: readonly CheckoutPipelineStageTrace[];
}>;

/**
 * SUCCESS means `data` is safe for a downstream stage. FAILED means that no
 * usable stage data exists, so every data-dependent downstream stage must be
 * SKIPPED. An issue with effect STOP has the same short-circuit behavior;
 * warnings and CONTINUE issues are aggregated without stopping execution.
 */
export type CheckoutPipelineStageSuccess<
  T,
  TStage extends CheckoutPipelineStage = CheckoutPipelineStage,
> = Readonly<{
  status: "SUCCESS";
  data: T;
  issues: readonly CheckoutPipelineIssue[];
  trace: CheckoutPipelineStageTrace<TStage, "SUCCESS">;
}>;

export type CheckoutPipelineStageFailure<
  TStage extends CheckoutPipelineStage = CheckoutPipelineStage,
> = Readonly<{
  status: "FAILED";
  failure: Readonly<{
    code: string;
    message: string;
    retryable: boolean;
  }>;
  issues: readonly CheckoutPipelineIssue[];
  trace: CheckoutPipelineStageTrace<TStage, "FAILED">;
}>;

export type CheckoutPipelineStageSkipped<
  TStage extends CheckoutPipelineStage = CheckoutPipelineStage,
> = Readonly<{
  status: "SKIPPED";
  reason: Readonly<{
    code: string;
    message: string;
    upstreamStage?: CheckoutPipelineStage;
  }>;
  issues: readonly CheckoutPipelineIssue[];
  trace: CheckoutPipelineStageTrace<TStage, "SKIPPED">;
}>;

export type CheckoutPipelineStageOutcome<
  T,
  TStage extends CheckoutPipelineStage = CheckoutPipelineStage,
> =
  | CheckoutPipelineStageSuccess<T, TStage>
  | CheckoutPipelineStageFailure<TStage>
  | CheckoutPipelineStageSkipped<TStage>;

export type CheckoutPipelineStageContext = Readonly<{
  executionId: string;
  correlationId: string;
  deadlineAt: string;
  requestedAt: string;
  checkoutId: string;
  storeId: string;
  currencyCode: string;
  localeCode: string | null;
  channelCode: string;
  /** Immutable business-time boundary for schedules and catalog pricing. */
  effectiveAt: string;
}>;

export type CheckoutPipelineEligibilityContext = Readonly<
  CheckoutPipelineStageContext & {
    buyerEligibility: CheckoutBuyerEligibilityContext | null;
  }
>;

/** Full checkout context. Only Checkout validation may receive buyer PII. */
export type CheckoutPipelineExecutionContext = Readonly<
  CheckoutPipelineStageContext & {
    buyer: CheckoutPipelineBuyer | null;
  }
>;

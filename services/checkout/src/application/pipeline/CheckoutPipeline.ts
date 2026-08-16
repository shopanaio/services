import type {
  CalculateDeliveryOptionsRequest,
  CalculateDeliveryOptionsResult,
  CalculatePreliminaryPricingRequest,
  CalculatePreliminaryPricingResult,
  CheckoutPipelineIssue,
  CheckoutPipelineStage,
  CheckoutPipelineStageOutcome,
  CheckoutPipelineStageTrace,
  CheckoutRecalculationRequest,
  CheckoutRecalculationResult,
  FinalizePricingQuoteRequest,
  FinalizePricingQuoteResult,
  GetAvailablePaymentMethodsRequest,
  GetAvailablePaymentMethodsResult,
  CheckoutLoyaltyQuoteResult,
  QuoteCheckoutLoyaltyRequest,
  ValidateCheckoutRequest,
  ValidateCheckoutResult,
} from "./contracts/index.js";
import type {
  DeliveryCheckoutPort,
  PaymentsCheckoutPort,
  PricingCheckoutPort,
  LoyaltyCheckoutPort,
} from "./ports/index.js";
import { CheckoutValidationRunner } from "./CheckoutValidationRunner.js";
import {
  CheckoutPipelineBoundaryError,
  parseCalculateDeliveryOptionsRequest,
  parseCalculateDeliveryOptionsResult,
  parseCalculatePreliminaryPricingRequest,
  parseCalculatePreliminaryPricingResult,
  parseCheckoutRecalculationRequest,
  parseCheckoutRecalculationResult,
  parseFinalizePricingQuoteRequest,
  parseFinalizePricingQuoteResult,
  parseGetAvailablePaymentMethodsRequest,
  parseGetAvailablePaymentMethodsResult,
  parseCheckoutLoyaltyQuoteResult,
  parseValidateCheckoutRequest,
  parseValidateCheckoutResult,
  toCheckoutDeliveryDestinations,
  toCheckoutPaymentDeliverySnapshot,
  toCheckoutPipelineEligibilityContext,
  toCheckoutPipelineStageContext,
  toCheckoutDeliveryContext,
  toCheckoutPricingCartIntent,
  toCheckoutPricingDeliverySnapshot,
  toPaymentsCheckoutEvaluationContext,
} from "./boundaries.js";
import { canonicalJsonRevision, canonicalJsonSha256 } from "./canonicalJson.js";
import { CheckoutPipelineStageError } from "./CheckoutPipelineStageError.js";

export interface CheckoutPipelinePorts {
  readonly pricing: PricingCheckoutPort;
  readonly delivery: DeliveryCheckoutPort;
  readonly payments: PaymentsCheckoutPort;
  readonly loyalty: LoyaltyCheckoutPort;
}

export interface CheckoutPipelineRuntime {
  now(): number;
  schedule(callback: () => void, delayMs: number): unknown;
  cancel(handle: unknown): void;
}

const defaultRuntime: CheckoutPipelineRuntime = {
  now: Date.now,
  schedule: (callback, delayMs) => setTimeout(callback, Math.max(0, delayMs)),
  cancel: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

const stageFailureDefaults: Record<CheckoutPipelineStage, readonly [string, string]> = {
  PRICING_PRELIMINARY: ["CHECKOUT_PRELIMINARY_PRICING_FAILED", "Checkout preliminary pricing could not be calculated."],
  DELIVERY: ["CHECKOUT_DELIVERY_FAILED", "Checkout delivery options could not be calculated."],
  PRICING_FINAL: ["CHECKOUT_FINAL_PRICING_FAILED", "Checkout final pricing could not be calculated."],
  LOYALTY: ["CHECKOUT_LOYALTY_FAILED", "Checkout loyalty redemption could not be calculated."],
  PAYMENT: ["CHECKOUT_PAYMENT_FAILED", "Checkout payment methods could not be calculated."],
  VALIDATION: ["CHECKOUT_VALIDATION_FAILED", "Checkout validation could not be completed."],
};

const UPSTREAM_REASON = {
  code: "CHECKOUT_PIPELINE_UPSTREAM_BLOCKED",
  message: "Checkout stage was skipped because an upstream stage blocked execution.",
} as const;

interface GuardAccepted<T> {
  readonly accepted: true;
  readonly value?: T;
  readonly error?: unknown;
  readonly resultObservedAt: number;
}

interface GuardTimeout {
  readonly accepted: false;
  readonly deadlineObservedAt: number;
}

type GuardResult<T> = GuardAccepted<T> | GuardTimeout;

function deadlineError(): CheckoutPipelineStageError {
  return new CheckoutPipelineStageError({
    code: "CHECKOUT_PIPELINE_DEADLINE_EXCEEDED",
    message: "Checkout recalculation exceeded its deadline.",
    retryable: true,
  });
}

export function runWithCheckoutDeadline<T>(
  runtime: CheckoutPipelineRuntime,
  deadlineAt: number,
  thunk: () => Promise<T>,
): Promise<GuardResult<T>> {
  const beforeCall = runtime.now();
  if (beforeCall >= deadlineAt) {
    return Promise.resolve({ accepted: false, deadlineObservedAt: beforeCall });
  }
  let promise: Promise<T>;
  try {
    promise = thunk();
  } catch (error) {
    const resultObservedAt = runtime.now();
    return Promise.resolve(
      resultObservedAt <= deadlineAt
        ? { accepted: true, error, resultObservedAt }
        : { accepted: false, deadlineObservedAt: resultObservedAt },
    );
  }
  return new Promise((resolve) => {
    let state: "PENDING" | "SETTLED" | "TIMED_OUT" = "PENDING";
    let handle: unknown;
    let handleActive = false;
    const cancel = (): void => {
      if (handleActive) {
        handleActive = false;
        runtime.cancel(handle);
      }
    };
    const settle = (value: T | undefined, error: unknown, rejected: boolean): void => {
      const observedAt = runtime.now();
      if (state !== "PENDING") return;
      cancel();
      if (observedAt <= deadlineAt) {
        state = "SETTLED";
        resolve(rejected
          ? { accepted: true, error, resultObservedAt: observedAt }
          : { accepted: true, value, resultObservedAt: observedAt });
      } else {
        state = "TIMED_OUT";
        resolve({ accepted: false, deadlineObservedAt: observedAt });
      }
    };
    try {
      promise.then(
        (value) => settle(value, undefined, false),
        (error) => settle(undefined, error, true),
      );
    } catch (error) {
      const observedAt = runtime.now();
      state = observedAt <= deadlineAt ? "SETTLED" : "TIMED_OUT";
      resolve(
        observedAt <= deadlineAt
          ? { accepted: true, error, resultObservedAt: observedAt }
          : { accepted: false, deadlineObservedAt: observedAt },
      );
      return;
    }
    const scheduleCheck = (): void => {
      let callbackDuringSchedule = false;
      let scheduleReturned = false;
      const newHandle = runtime.schedule(() => {
        if (!scheduleReturned) {
          callbackDuringSchedule = true;
          return;
        }
        if (state !== "PENDING") return;
        handleActive = false;
        const observedAt = runtime.now();
        if (observedAt <= deadlineAt) {
          scheduleCheck();
          return;
        }
        state = "TIMED_OUT";
        resolve({ accepted: false, deadlineObservedAt: observedAt });
      }, Math.max(0, deadlineAt - runtime.now() + 1));
      scheduleReturned = true;
      if (callbackDuringSchedule) {
        throw new TypeError("CheckoutPipelineRuntime.schedule must not invoke synchronously");
      }
      handle = newHandle;
      handleActive = state === "PENDING";
    };
    try {
      scheduleCheck();
    } catch (error) {
      if (state === "PENDING") {
        const observedAt = runtime.now();
        state = observedAt <= deadlineAt ? "SETTLED" : "TIMED_OUT";
        resolve(
          observedAt <= deadlineAt
            ? { accepted: true, error, resultObservedAt: observedAt }
            : { accepted: false, deadlineObservedAt: observedAt },
        );
      }
    }
  });
}

function failureIssue(stage: CheckoutPipelineStage, failure: { code: string; message: string; retryable: boolean }): CheckoutPipelineIssue {
  return { stage, ...failure, severity: "ERROR", effect: "STOP", field: [] };
}

function hasStop(outcome: { status: string; issues: readonly CheckoutPipelineIssue[] }): boolean {
  return outcome.status === "FAILED" || outcome.issues.some(({ effect }) => effect === "STOP");
}

function iso(value: number): string {
  return new Date(value).toISOString();
}

function sanitizeFailure(stage: CheckoutPipelineStage, error: unknown): CheckoutPipelineStageError {
  if (error instanceof CheckoutPipelineStageError) return error;
  if (error instanceof CheckoutPipelineBoundaryError || (error instanceof Error && error.name === "ZodError")) {
    return new CheckoutPipelineStageError({
      code: "CHECKOUT_PIPELINE_BOUNDARY_VIOLATION",
      message: "Checkout pipeline received an invalid boundary payload.",
      retryable: false,
      cause: error,
    });
  }
  const [code, message] = stageFailureDefaults[stage];
  return new CheckoutPipelineStageError({ code, message, retryable: false, cause: error });
}

function preliminaryIssues(result: CalculatePreliminaryPricingResult): CheckoutPipelineIssue[] {
  const issues: CheckoutPipelineIssue[] = [];
  result.discountCodeResolutions.forEach((resolution, index) => {
    if (resolution.status === "REJECTED") {
      issues.push({
        stage: "PRICING_PRELIMINARY",
        code: `DISCOUNT_CODE_REJECTED_${resolution.reason}`,
        message: resolution.message,
        severity: "WARNING",
        effect: "CONTINUE",
        field: ["cartIntent", "discountCodes", String(index)],
        retryable: resolution.retryable,
      });
    }
  });
  return issues;
}

function deliveryIssues(result: CalculateDeliveryOptionsResult): CheckoutPipelineIssue[] {
  return result.issues.map((issue) => ({
    stage: "DELIVERY",
    code: issue.code,
    message: issue.message,
    severity: issue.severity,
    effect: "CONTINUE",
    field: issue.carrierServiceAccountId !== null
      ? ["delivery", "groups", issue.groupId ?? "unassigned", "carrierServices", issue.carrierServiceAccountId]
      : issue.groupId !== null
        ? ["delivery", "groups", issue.groupId]
        : [],
    retryable: issue.retryable,
  }));
}

function finalPricingIssues(
  preliminary: CalculatePreliminaryPricingResult,
  finalQuote: FinalizePricingQuoteResult,
): CheckoutPipelineIssue[] {
  const preliminaryByCode = new Map(preliminary.discountCodeResolutions.map((resolution) => [resolution.normalizedCode, resolution]));
  const issues: CheckoutPipelineIssue[] = [];
  finalQuote.discountCodeResolutions.forEach((resolution, index) => {
    if (resolution.status === "REJECTED" && preliminaryByCode.get(resolution.normalizedCode)?.status === "PENDING") {
      issues.push({
        stage: "PRICING_FINAL",
        code: `DISCOUNT_CODE_REJECTED_${resolution.reason}`,
        message: resolution.message,
        severity: "WARNING",
        effect: "CONTINUE",
        field: ["cartIntent", "discountCodes", String(index)],
        retryable: resolution.retryable,
      });
    }
  });
  return issues;
}

function paymentIssues(result: GetAvailablePaymentMethodsResult): CheckoutPipelineIssue[] {
  return result.issues.map((issue) => ({
    stage: "PAYMENT",
    code: issue.code,
    message: issue.message,
    severity: issue.severity,
    effect: issue.severity === "ERROR" ? "STOP" : "CONTINUE",
    field: ["payment"],
    retryable: issue.retryable,
  }));
}

function loyaltyIssues(result: CheckoutLoyaltyQuoteResult): CheckoutPipelineIssue[] {
  if (result.status === "NONE" || result.status === "QUOTED") return [];
  return [{
    stage: "LOYALTY",
    code: result.code,
    message: result.status === "REJECTED"
      ? result.message
      : "Loyalty points cannot be applied to this checkout.",
    severity: "ERROR",
    effect: "STOP",
    field: ["loyaltyRedemption"],
    retryable: result.retryable,
  }];
}

function validationIssues(result: ValidateCheckoutResult): CheckoutPipelineIssue[] {
  return result.operations.map((operation) => ({
    stage: "VALIDATION",
    code: operation.code,
    message: operation.message,
    severity: operation.severity,
    effect: operation.severity === "ERROR" ? "STOP" : "CONTINUE",
    field: operation.field,
    ...(operation.lineId === null ? {} : { lineId: operation.lineId }),
    retryable: false,
  }));
}

export class CheckoutPipeline {
  private readonly runtime: CheckoutPipelineRuntime;

  constructor(
    private readonly dependencies: CheckoutPipelinePorts & {
      readonly validationRunner: CheckoutValidationRunner;
      readonly runtime?: CheckoutPipelineRuntime;
    },
  ) {
    this.runtime = dependencies.runtime ?? defaultRuntime;
  }

  async recalculate(rawRequest: CheckoutRecalculationRequest): Promise<CheckoutRecalculationResult> {
    const request = parseCheckoutRecalculationRequest(rawRequest);
    const deadlineAt = Date.parse(request.context.deadlineAt);
    const executionStarted = this.runtime.now();
    let deadlineObservedAt: number | null = null;
    let firstBlockingStage: CheckoutPipelineStage | null = null;

    const runStage = async <
      TRequest,
      TResult,
      TStage extends CheckoutPipelineStage,
    >(input: {
      stage: TStage;
      request: TRequest;
      call: (request: TRequest) => Promise<TResult>;
      parseResult: (request: TRequest, value: unknown) => TResult;
      issues: (result: TResult) => CheckoutPipelineIssue[];
    }): Promise<CheckoutPipelineStageOutcome<TResult, TStage>> => {
      if (firstBlockingStage !== null) {
        const at = this.runtime.now();
        return {
          status: "SKIPPED",
          reason: { ...UPSTREAM_REASON, upstreamStage: firstBlockingStage },
          issues: [],
          trace: { stage: input.stage, status: "SKIPPED", startedAt: iso(at), completedAt: iso(at), durationMs: 0 },
        };
      }
      const startedAt = this.runtime.now();
      let inputRevision: string;
      try {
        inputRevision = canonicalJsonRevision(input.request);
      } catch (error) {
        const failure = sanitizeFailure(input.stage, error);
        const completedAt = this.runtime.now();
        firstBlockingStage = input.stage;
        return this.failedOutcome(input.stage, failure, startedAt, completedAt);
      }
      const guarded = await runWithCheckoutDeadline(this.runtime, deadlineAt, () => input.call(input.request));
      if (!guarded.accepted) {
        deadlineObservedAt ??= guarded.deadlineObservedAt;
        const completedAt = this.runtime.now();
        firstBlockingStage = input.stage;
        return this.failedOutcome(input.stage, deadlineError(), startedAt, completedAt, inputRevision);
      }
      if (guarded.error !== undefined) {
        const failure = sanitizeFailure(input.stage, guarded.error);
        const completedAt = this.runtime.now();
        firstBlockingStage = input.stage;
        return this.failedOutcome(input.stage, failure, startedAt, completedAt, inputRevision, guarded.resultObservedAt);
      }
      try {
        const parsed = input.parseResult(input.request, guarded.value);
        const issues = input.issues(parsed);
        const completedAt = this.runtime.now();
        const outcome: CheckoutPipelineStageOutcome<TResult, TStage> = {
          status: "SUCCESS",
          data: parsed,
          issues,
          trace: {
            stage: input.stage,
            status: "SUCCESS",
            startedAt: iso(startedAt),
            completedAt: iso(completedAt),
            durationMs: Math.max(0, completedAt - startedAt),
            resultObservedAt: iso(guarded.resultObservedAt),
            inputRevision,
            outputRevision: canonicalJsonRevision(parsed),
          },
        };
        if (hasStop(outcome)) firstBlockingStage = input.stage;
        return outcome;
      } catch (error) {
        const failure = sanitizeFailure(input.stage, error);
        const completedAt = this.runtime.now();
        firstBlockingStage = input.stage;
        return this.failedOutcome(input.stage, failure, startedAt, completedAt, inputRevision, guarded.resultObservedAt);
      }
    };

    const buildStageRequest = <
      TRequest,
      TResult,
      TStage extends CheckoutPipelineStage,
    >(
      stage: TStage,
      builder: () => TRequest,
    ): { request?: TRequest; failure?: CheckoutPipelineStageOutcome<TResult, TStage> } => {
      if (firstBlockingStage !== null) return {};
      const startedAt = this.runtime.now();
      try {
        return { request: builder() };
      } catch (error) {
        const failure = sanitizeFailure(stage, error);
        const completedAt = this.runtime.now();
        firstBlockingStage = stage;
        return { failure: this.failedOutcome(stage, failure, startedAt, completedAt) };
      }
    };
    const noStageRequest = <TRequest, TResult, TStage extends CheckoutPipelineStage>(): {
      request?: TRequest;
      failure?: CheckoutPipelineStageOutcome<TResult, TStage>;
    } => ({});

    const preliminaryBuild = buildStageRequest<
      CalculatePreliminaryPricingRequest,
      CalculatePreliminaryPricingResult,
      "PRICING_PRELIMINARY"
    >("PRICING_PRELIMINARY", () =>
      parseCalculatePreliminaryPricingRequest({
        context: toCheckoutPipelineEligibilityContext(request.context),
        cartIntent: toCheckoutPricingCartIntent(request.cartIntent),
      }),
    );
    const preliminaryPricing = preliminaryBuild.failure ??
      await runStage<CalculatePreliminaryPricingRequest, CalculatePreliminaryPricingResult, "PRICING_PRELIMINARY">({
        stage: "PRICING_PRELIMINARY",
        request: preliminaryBuild.request!,
        call: (value) => this.dependencies.pricing.calculatePreliminaryQuote(value),
        parseResult: parseCalculatePreliminaryPricingResult,
        issues: preliminaryIssues,
      });

    const deliveryBuild = preliminaryPricing.status === "SUCCESS"
      ? buildStageRequest<CalculateDeliveryOptionsRequest, CalculateDeliveryOptionsResult, "DELIVERY">("DELIVERY", () => parseCalculateDeliveryOptionsRequest({
          context: toCheckoutDeliveryContext(request.context),
          preliminary: preliminaryPricing.data,
          destinations: toCheckoutDeliveryDestinations(request.cartIntent.destinations, preliminaryPricing.data),
          selections: request.cartIntent.selectedDeliveryOptions,
          cartAttributes: request.cartIntent.attributes,
        }))
      : noStageRequest<CalculateDeliveryOptionsRequest, CalculateDeliveryOptionsResult, "DELIVERY">();
    const delivery = deliveryBuild.failure ?? (deliveryBuild.request === undefined
      ? this.skipped<CalculateDeliveryOptionsResult, "DELIVERY">("DELIVERY", firstBlockingStage!, this.runtime.now())
      : await runStage<CalculateDeliveryOptionsRequest, CalculateDeliveryOptionsResult, "DELIVERY">({
          stage: "DELIVERY",
          request: deliveryBuild.request,
          call: (value) => this.dependencies.delivery.calculateOptions(value),
          parseResult: parseCalculateDeliveryOptionsResult,
          issues: deliveryIssues,
        }));
    const preliminaryData = preliminaryPricing.status === "SUCCESS"
      ? preliminaryPricing.data
      : null;

    const finalBuild = preliminaryPricing.status === "SUCCESS" && delivery.status === "SUCCESS"
      ? buildStageRequest<FinalizePricingQuoteRequest, FinalizePricingQuoteResult, "PRICING_FINAL">("PRICING_FINAL", () => parseFinalizePricingQuoteRequest({
          context: toCheckoutPipelineEligibilityContext(request.context),
          preliminary: preliminaryPricing.data,
          delivery: toCheckoutPricingDeliverySnapshot(delivery.data),
        }))
      : noStageRequest<FinalizePricingQuoteRequest, FinalizePricingQuoteResult, "PRICING_FINAL">();
    const finalPricing = finalBuild.failure ?? (finalBuild.request === undefined
      ? this.skipped<FinalizePricingQuoteResult, "PRICING_FINAL">("PRICING_FINAL", firstBlockingStage!, this.runtime.now())
      : await runStage<FinalizePricingQuoteRequest, FinalizePricingQuoteResult, "PRICING_FINAL">({
          stage: "PRICING_FINAL",
          request: finalBuild.request,
          call: (value) => this.dependencies.pricing.finalizeQuote(value),
          parseResult: parseFinalizePricingQuoteResult,
          issues: (result) => finalPricingIssues(preliminaryData!, result),
        }));

    const loyaltyBuild = finalPricing.status === "SUCCESS"
      ? buildStageRequest<QuoteCheckoutLoyaltyRequest, CheckoutLoyaltyQuoteResult, "LOYALTY">("LOYALTY", () => ({
          context: {
            executionId: request.context.executionId,
            checkoutId: request.context.checkoutId,
            checkoutVersion: request.context.expectedCheckoutVersion + 1,
            storeId: request.context.storeId,
            customerId: request.context.buyer?.customerId ?? null,
            currencyCode: request.context.currencyCode,
            channelCode: request.context.channelCode,
            effectiveAt: request.context.effectiveAt,
            requestedAt: request.context.requestedAt,
            deadlineAt: request.context.deadlineAt,
            correlationId: request.context.correlationId,
            pricingQuoteId: finalPricing.data.quoteId,
            pricingQuoteRevision: finalPricing.data.revision,
            payableBeforeLoyalty: finalPricing.data.totals.payableTotal,
            customerEligibilityRevision: request.context.buyer?.segmentMembershipRevision ?? "guest",
            segmentIds: request.context.buyer?.segmentIds ?? [],
            segmentMembershipRevision: request.context.buyer?.segmentMembershipRevision ?? "guest",
          },
          intent: request.loyaltyRedemption,
          finalQuote: finalPricing.data,
        }))
      : noStageRequest<QuoteCheckoutLoyaltyRequest, CheckoutLoyaltyQuoteResult, "LOYALTY">();
    const loyalty = loyaltyBuild.failure ?? (loyaltyBuild.request === undefined
      ? this.skipped<CheckoutLoyaltyQuoteResult, "LOYALTY">("LOYALTY", firstBlockingStage!, this.runtime.now())
      : await runStage<QuoteCheckoutLoyaltyRequest, CheckoutLoyaltyQuoteResult, "LOYALTY">({
          stage: "LOYALTY",
          request: loyaltyBuild.request,
          call: (value) => this.dependencies.loyalty.quote(value),
          parseResult: parseCheckoutLoyaltyQuoteResult,
          issues: loyaltyIssues,
        }));

    const paymentBuild = preliminaryPricing.status === "SUCCESS" && delivery.status === "SUCCESS" && finalPricing.status === "SUCCESS" && loyalty.status === "SUCCESS"
      ? buildStageRequest<GetAvailablePaymentMethodsRequest, GetAvailablePaymentMethodsResult, "PAYMENT">("PAYMENT", () => parseGetAvailablePaymentMethodsRequest({
          context: toPaymentsCheckoutEvaluationContext(request.context),
          selection: request.cartIntent.selectedPaymentMethod,
          finalQuote: finalPricing.data,
          payableAmount: loyalty.data.payableAfterLoyalty,
          loyaltyRedemption: loyalty.data.status === "QUOTED" ? {
            quoteId: loyalty.data.quote.quoteId,
            quoteRevision: loyalty.data.quote.revision,
            discount: loyalty.data.quote.discount,
          } : null,
          delivery: toCheckoutPaymentDeliverySnapshot(delivery.data, preliminaryPricing.data),
        }))
      : noStageRequest<GetAvailablePaymentMethodsRequest, GetAvailablePaymentMethodsResult, "PAYMENT">();
    const payment = paymentBuild.failure ?? (paymentBuild.request === undefined
      ? this.skipped<GetAvailablePaymentMethodsResult, "PAYMENT">("PAYMENT", firstBlockingStage!, this.runtime.now())
      : await runStage<GetAvailablePaymentMethodsRequest, GetAvailablePaymentMethodsResult, "PAYMENT">({
          stage: "PAYMENT",
          request: paymentBuild.request,
          call: (value) => this.dependencies.payments.getAvailableMethods(value),
          parseResult: parseGetAvailablePaymentMethodsResult,
          issues: paymentIssues,
        }));

    const validationBuild = preliminaryPricing.status === "SUCCESS" && delivery.status === "SUCCESS" && finalPricing.status === "SUCCESS" && loyalty.status === "SUCCESS" && payment.status === "SUCCESS"
      ? buildStageRequest<ValidateCheckoutRequest, ValidateCheckoutResult, "VALIDATION">("VALIDATION", () => parseValidateCheckoutRequest({
          context: request.context,
          cartIntent: request.cartIntent,
          preliminary: preliminaryPricing.data,
          delivery: delivery.data,
          finalQuote: finalPricing.data,
          payableAmount: loyalty.data.payableAfterLoyalty,
          payment: payment.data,
        }))
      : noStageRequest<ValidateCheckoutRequest, ValidateCheckoutResult, "VALIDATION">();
    const validation = validationBuild.failure ?? (validationBuild.request === undefined
      ? this.skipped<ValidateCheckoutResult, "VALIDATION">("VALIDATION", firstBlockingStage!, this.runtime.now())
      : await runStage<ValidateCheckoutRequest, ValidateCheckoutResult, "VALIDATION">({
          stage: "VALIDATION",
          request: validationBuild.request,
          call: (value) => this.dependencies.validationRunner.validate(value),
          parseResult: parseValidateCheckoutResult,
          issues: validationIssues,
        }));

    const stages = [preliminaryPricing, delivery, finalPricing, loyalty, payment, validation] as const;
    const issues = stages.flatMap((stage) => stage.issues);
    const executionCompleted = this.runtime.now();
    const resultRevisionPayload = {
      schemaVersion: 1,
      checkoutId: request.context.checkoutId,
      basedOnCheckoutVersion: request.context.expectedCheckoutVersion,
      change: request.change,
      stages: stages.map((outcome, index) => {
        const stage = (["PRICING_PRELIMINARY", "DELIVERY", "PRICING_FINAL", "LOYALTY", "PAYMENT", "VALIDATION"] as const)[index]!;
        if (outcome.status === "SUCCESS") return { stage, status: outcome.status, revision: outcome.data.revision, issues: outcome.issues };
        if (outcome.status === "FAILED") return { stage, status: outcome.status, failure: outcome.failure, issues: outcome.issues };
        return { stage, status: outcome.status, reason: outcome.reason, issues: outcome.issues };
      }),
    };
    const result: CheckoutRecalculationResult = {
      executionId: request.context.executionId,
      checkoutId: request.context.checkoutId,
      basedOnCheckoutVersion: request.context.expectedCheckoutVersion,
      resultRevision: `checkout-pipeline-result:v1:sha256:${canonicalJsonSha256(resultRevisionPayload)}`,
      preliminaryPricing,
      delivery,
      finalPricing,
      loyalty,
      payment,
      validation,
      issues,
      trace: {
        executionId: request.context.executionId,
        correlationId: request.context.correlationId,
        startedAt: iso(executionStarted),
        completedAt: iso(executionCompleted),
        deadlineAt: request.context.deadlineAt,
        deadlineExceeded: deadlineObservedAt !== null,
        deadlineObservedAt: deadlineObservedAt === null ? null : iso(deadlineObservedAt),
        stages: stages.map(({ trace }) => trace),
      },
    };
    return parseCheckoutRecalculationResult(request, result);
  }

  private failedOutcome<T, TStage extends CheckoutPipelineStage>(
    stage: TStage,
    error: CheckoutPipelineStageError,
    startedAt: number,
    completedAt: number,
    inputRevision?: string,
    resultObservedAt?: number,
  ): CheckoutPipelineStageOutcome<T, TStage> {
    const failure = { code: error.code, message: error.message, retryable: error.retryable };
    return {
      status: "FAILED",
      failure,
      issues: [failureIssue(stage, failure)],
      trace: {
        stage,
        status: "FAILED",
        startedAt: iso(startedAt),
        completedAt: iso(completedAt),
        durationMs: Math.max(0, completedAt - startedAt),
        ...(resultObservedAt === undefined ? {} : { resultObservedAt: iso(resultObservedAt) }),
        ...(inputRevision === undefined ? {} : { inputRevision }),
      },
    };
  }

  private skipped<T, TStage extends CheckoutPipelineStage>(stage: TStage, upstreamStage: CheckoutPipelineStage, at: number): CheckoutPipelineStageOutcome<T, TStage> {
    return {
      status: "SKIPPED",
      reason: { ...UPSTREAM_REASON, upstreamStage },
      issues: [],
      trace: { stage, status: "SKIPPED", startedAt: iso(at), completedAt: iso(at), durationMs: 0 },
    };
  }
}

export function createCheckoutPipeline(
  dependencies: CheckoutPipelinePorts & {
    readonly validationRunner: CheckoutValidationRunner;
    readonly runtime?: CheckoutPipelineRuntime;
  },
): CheckoutPipeline {
  return new CheckoutPipeline(dependencies);
}

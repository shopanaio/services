import { v7 as uuidv7 } from "uuid";
import { parseCheckoutRecalculationRequest } from "../pipeline/boundaries.js";
import type {
  CheckoutPipelineBuyer,
  CheckoutPipelineChange,
  CheckoutRecalculationRequest,
} from "../pipeline/contracts/index.js";
import type {
  CheckoutBuyerEligibilityPort,
  CheckoutMutationDraft,
  CheckoutMutationExecutionContext,
} from "./contracts.js";
import { CheckoutMutationError } from "./contracts.js";

export interface CheckoutMutationRuntimePolicy {
  now(): Date;
  deadlineMs: number;
  createId(): string;
  schedule?(callback: () => void, delayMs: number): unknown;
  cancel?(handle: unknown): void;
}

export const defaultCheckoutMutationRuntimePolicy: CheckoutMutationRuntimePolicy = {
  now: () => new Date(),
  deadlineMs: 15_000,
  createId: uuidv7,
  schedule: (callback, delayMs) => setTimeout(callback, Math.max(0, delayMs)),
  cancel: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

export class CheckoutRecalculationRequestFactory {
  constructor(
    private readonly eligibility: CheckoutBuyerEligibilityPort,
    private readonly runtime: CheckoutMutationRuntimePolicy = defaultCheckoutMutationRuntimePolicy,
  ) {}

  async create(input: {
    draft: CheckoutMutationDraft;
    change: CheckoutPipelineChange;
    context: CheckoutMutationExecutionContext;
  }): Promise<CheckoutRecalculationRequest> {
    if (input.context.storeId !== input.draft.storeId) {
      throw new CheckoutMutationError(
        "CHECKOUT_STORE_CONTEXT_MISMATCH",
        "Checkout store context does not match the mutation draft.",
        false,
      );
    }
    const effective = this.runtime.now();
    const effectiveAt = effective.toISOString();
    const deadlineAt = new Date(effective.getTime() + this.runtime.deadlineMs).toISOString();
    const executionId = this.runtime.createId();
    const correlationId = input.context.correlationId ?? executionId;
    const buyer = await this.createBuyer(input.draft, effectiveAt, deadlineAt);
    return parseCheckoutRecalculationRequest({
      context: {
        executionId,
        correlationId,
        deadlineAt,
        requestedAt: effectiveAt,
        checkoutId: input.draft.checkoutId,
        expectedCheckoutVersion: input.draft.version,
        storeId: input.draft.storeId,
        currencyCode: input.draft.currencyCode,
        localeCode: input.draft.localeCode,
        channelCode: input.draft.channelCode,
        effectiveAt,
        buyer,
      },
      change: input.change,
      cartIntent: input.draft.cartIntent,
      loyaltyRedemption: input.draft.loyaltyRedemption,
    });
  }

  private async createBuyer(
    draft: CheckoutMutationDraft,
    effectiveAt: string,
    deadlineAt: string,
  ): Promise<CheckoutPipelineBuyer | null> {
    const identity = draft.buyerIdentity;
    if (identity === null) return null;
    if (identity.customerId === null) {
      return {
        customerId: null,
        email: identity.email,
        phone: identity.phone,
        countryCode: identity.countryCode,
        marketId: identity.marketId,
        companyId: identity.companyId,
        segmentIds: [],
        segmentMembershipRevision: null,
        data: identity.data,
      };
    }
    const eligibility = await this.withDeadline(
      this.eligibility.resolve({
        storeId: draft.storeId,
        customerId: identity.customerId,
        effectiveAt,
      }),
      deadlineAt,
    );
    if (eligibility.customerId !== identity.customerId || eligibility.effectiveAt !== effectiveAt) {
      throw new CheckoutMutationError(
        "BUYER_ELIGIBILITY_RESPONSE_INVALID",
        "Buyer eligibility response did not match the checkout request.",
        true,
      );
    }
    return {
      customerId: identity.customerId,
      email: identity.email,
      phone: identity.phone,
      countryCode: identity.countryCode,
      marketId: identity.marketId,
      companyId: identity.companyId,
      segmentIds: eligibility.segmentIds,
      segmentMembershipRevision: eligibility.segmentMembershipRevision,
      data: identity.data,
    };
  }

  private withDeadline<T>(promise: Promise<T>, deadlineAt: string): Promise<T> {
    const schedule = this.runtime.schedule ?? defaultCheckoutMutationRuntimePolicy.schedule!;
    const cancel = this.runtime.cancel ?? defaultCheckoutMutationRuntimePolicy.cancel!;
    const delayMs = Date.parse(deadlineAt) - this.runtime.now().getTime();
    if (delayMs <= 0) {
      return Promise.reject(eligibilityDeadlineError());
    }
    return new Promise<T>((resolve, reject) => {
      const handle = schedule(() => reject(eligibilityDeadlineError()), delayMs);
      promise.then(
        (value) => {
          cancel(handle);
          if (this.runtime.now().getTime() >= Date.parse(deadlineAt)) {
            reject(eligibilityDeadlineError());
          } else {
            resolve(value);
          }
        },
        (cause) => {
          cancel(handle);
          reject(cause);
        },
      );
    });
  }
}

function eligibilityDeadlineError(): CheckoutMutationError {
  return new CheckoutMutationError(
    "BUYER_ELIGIBILITY_DEADLINE_EXCEEDED",
    "Buyer eligibility resolution exceeded the checkout mutation deadline.",
    true,
  );
}

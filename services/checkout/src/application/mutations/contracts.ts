import type {
  CheckoutCartIntent,
  CheckoutPipelineJsonObject,
  CheckoutPipelineIssue,
  CheckoutLoyaltyRedemptionIntent,
  CheckoutRecalculationResult,
} from "../pipeline/contracts/index.js";

export interface CheckoutStorefrontExecutionIdentity {
  connectionId: string;
  installationId: string;
  credentialId: string;
  accessMode: "PUBLIC" | "PRIVATE";
}

export interface CheckoutMutationExecutionContext {
  storeId: string;
  storefrontAccess: CheckoutStorefrontExecutionIdentity;
  correlationId?: string;
}

export interface CheckoutBuyerIdentityDraft {
  customerId: string | null;
  email: string | null;
  phone: string | null;
  countryCode: string | null;
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  marketId: string | null;
  companyId: string | null;
  data: CheckoutPipelineJsonObject | null;
}

export interface CheckoutBillingAddressDraft {
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  address1: string | null;
  address2: string | null;
  city: string | null;
  countryCode: string | null;
  provinceCode: string | null;
  postalCode: string | null;
  phone: string | null;
  data: CheckoutPipelineJsonObject | null;
}

export interface CheckoutTagDefinition {
  id: string;
  slug: string;
  isUnique: boolean;
}

export interface CheckoutLineTagAssignment {
  lineId: string;
  tagId: string;
}

export interface CheckoutMutationDraft {
  checkoutId: string;
  storeId: string;
  version: number;
  currencyCode: string;
  localeCode: string | null;
  channelCode: string;
  externalSource: string | null;
  externalId: string | null;
  buyerIdentity: CheckoutBuyerIdentityDraft | null;
  billingAddress: CheckoutBillingAddressDraft | null;
  cartIntent: CheckoutCartIntent;
  customerNote: string | null;
  tags: readonly CheckoutTagDefinition[];
  lineTagAssignments: readonly CheckoutLineTagAssignment[];
  loyaltyRedemption: CheckoutLoyaltyRedemptionIntent | null;
}

export interface CheckoutCommittedSnapshot {
  checkoutId: string;
  storeId: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  lifecycle: CheckoutLifecycle;
  draft: CheckoutMutationDraft;
  result: CheckoutRecalculationResult;
}

export type CheckoutLifecycleStatus =
  | "OPEN"
  | "READY"
  | "PLACED"
  | "EXPIRED"
  | "ABANDONED";

export interface CheckoutLifecycle {
  status: CheckoutLifecycleStatus;
  expiresAt: string;
  piiAnonymizedAt: string | null;
  retentionUntil: string;
}

export interface CheckoutMutationSnapshotPort {
  load(input: {
    checkoutId: string;
    storeId: string;
  }): Promise<CheckoutCommittedSnapshot | null>;
}

export interface CheckoutRecalculationCommitPort {
  create(input: {
    reservation: CheckoutCreateIdempotencyReservation;
    draft: CheckoutMutationDraft;
    result: CheckoutRecalculationResult;
  }): Promise<
    | { status: "COMMITTED"; checkout: CheckoutCommittedSnapshot }
    | { status: "VERSION_CONFLICT" }
  >;

  commit(input: {
    storeId: string;
    checkoutId: string;
    expectedVersion: number;
    nextVersion: number;
    createdAt: string;
    draft: CheckoutMutationDraft;
    result: CheckoutRecalculationResult;
  }): Promise<
    | { status: "COMMITTED"; checkout: CheckoutCommittedSnapshot }
    | { status: "VERSION_CONFLICT" }
  >;

  commitWithoutRecalculation(input: {
    storeId: string;
    checkoutId: string;
    expectedVersion: number;
    nextVersion: number;
    createdAt: string;
    draft: CheckoutMutationDraft;
    previousResult: CheckoutRecalculationResult;
  }): Promise<
    | { status: "COMMITTED"; checkout: CheckoutCommittedSnapshot }
    | { status: "VERSION_CONFLICT" }
  >;
}

export interface CheckoutCreateIdempotencyIdentity {
  storeId: string;
  connectionId: string;
  operation: "CHECKOUT_CREATE";
  idempotencyKey: string;
}

export interface CheckoutCreateIdempotencyRequest {
  identity: CheckoutCreateIdempotencyIdentity;
  requestHash: string;
  checkoutId: string;
  initiatingCredentialId: string;
  reservedIds: CheckoutPipelineJsonObject;
}

export interface CheckoutCreateIdempotencyReservation
  extends CheckoutCreateIdempotencyRequest {
  leaseToken: string;
}

export type CheckoutCreateReservationResult =
  | { status: "RESERVED"; reservation: CheckoutCreateIdempotencyReservation }
  | { status: "IN_PROGRESS" }
  | { status: "KEY_REUSED" }
  | { status: "COMMITTED"; checkout: CheckoutCommittedSnapshot }
  | { status: "FINAL_FAILED"; failure: CheckoutMutationPublicFailure };

export interface CheckoutCreateIdempotencyPort {
  reserve(input: CheckoutCreateIdempotencyRequest): Promise<CheckoutCreateReservationResult>;
  markFailed(input: {
    reservation: CheckoutCreateIdempotencyReservation;
    failure: CheckoutMutationPublicFailure;
    final: boolean;
  }): Promise<void>;
}

export interface CheckoutBuyerEligibilitySnapshot {
  customerId: string;
  effectiveAt: string;
  segmentIds: readonly string[];
  segmentMembershipRevision: string;
}

export interface CheckoutBuyerEligibilityPort {
  resolve(input: {
    storeId: string;
    customerId: string;
    effectiveAt: string;
  }): Promise<CheckoutBuyerEligibilitySnapshot>;
}

export type CheckoutMutationPublicFailure = Readonly<{
  code: string;
  message: string;
  retryable: boolean;
}>;

export class CheckoutMutationError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly retryable: boolean,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "CheckoutMutationError";
  }
}

export function invalidCheckoutMutation(code: string, message: string): CheckoutMutationError {
  return new CheckoutMutationError(code, message, false);
}

export function assertCompletePipelineResult(
  result: CheckoutRecalculationResult,
): void {
  const outcomes = [
    result.preliminaryPricing,
    result.delivery,
    result.finalPricing,
    result.loyalty,
    result.payment,
    result.validation,
  ];
  const incomplete = outcomes.find(({ status }) => status !== "SUCCESS");
  if (!incomplete) return;
  const failure = incomplete.status === "FAILED" ? incomplete.failure : null;
  throw new CheckoutMutationError(
    failure?.code ?? "CHECKOUT_PIPELINE_INCOMPLETE",
    failure?.message ?? "Checkout recalculation did not produce a complete snapshot.",
    failure?.retryable ?? result.issues.some((issue) => issue.retryable),
  );
}

export function committedIssues(
  checkout: CheckoutCommittedSnapshot,
): readonly CheckoutPipelineIssue[] {
  return checkout.result.issues;
}

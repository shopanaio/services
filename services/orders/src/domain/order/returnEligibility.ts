import type { OrderReturnPolicySnapshotV1 } from "@shopana/broker-types";

const DAY_MS = 86_400_000;

export type ReturnEligibilityContext = Readonly<{
  orderStatus: string;
  /** Latest confirmed receipt time; null means the return window has not started. */
  returnWindowStartedAt: string | null;
  now: string;
  returnPolicy: OrderReturnPolicySnapshotV1 | null;
}>;

export type ReturnEligibilityLine = Readonly<{
  orderLineId: string;
  quantity: number;
  cancelledQuantity: number;
  /** Quantity recorded by successfully completed fulfilments. */
  fulfilledQuantity: number;
  /** Open (non-rejected/cancelled) requested quantity for this line. */
  requestedQuantity: number;
}>;

export type ReturnLineEligibility = Readonly<{
  orderLineId: string;
  eligible: boolean;
  maxReturnableQuantity: number;
  reasonCode: string | null;
}>;

/**
 * Reads the return policy snapshot captured from Checkout at placement time.
 * The snapshot is stored verbatim in order metadata.
 */
export function extractReturnPolicy(
  metadata: Readonly<Record<string, unknown>> | null | undefined,
): OrderReturnPolicySnapshotV1 | null {
  const raw = metadata?.returnPolicy;
  if (!raw || typeof raw !== "object") return null;
  const policy = raw as Partial<OrderReturnPolicySnapshotV1>;
  if (typeof policy.policyId !== "string" || typeof policy.revision !== "string") return null;
  return {
    policyId: policy.policyId,
    revision: policy.revision,
    timeframeDays: typeof policy.timeframeDays === "number" ? policy.timeframeDays : null,
    restockingFeePercentage:
      typeof policy.restockingFeePercentage === "string" ? policy.restockingFeePercentage : null,
    allowedReasons: Array.isArray(policy.allowedReasons)
      ? policy.allowedReasons.filter((reason): reason is string => typeof reason === "string")
      : [],
    finalizedOrdersOnly: policy.finalizedOrdersOnly === true,
    capturedAt: typeof policy.capturedAt === "string" ? policy.capturedAt : "",
  };
}

/**
 * Returns a stable violation code when the order cannot be returned at all
 * under the captured policy, or null when the order passes the policy gate.
 */
export function returnPolicyViolation(
  context: ReturnEligibilityContext,
):
  | "ORDER_RETURN_FINALIZED_REQUIRED"
  | "ORDER_RETURN_WINDOW_NOT_STARTED"
  | "ORDER_RETURN_WINDOW_EXPIRED"
  | null {
  const policy = context.returnPolicy;
  if (!policy) return null;
  if (policy.finalizedOrdersOnly && context.orderStatus !== "CLOSED") {
    return "ORDER_RETURN_FINALIZED_REQUIRED";
  }
  const windowStart = context.returnWindowStartedAt;
  if (!windowStart) return "ORDER_RETURN_WINDOW_NOT_STARTED";
  if (
    policy.timeframeDays !== null &&
    Date.parse(context.now) - Date.parse(windowStart) > policy.timeframeDays * DAY_MS
  ) {
    return "ORDER_RETURN_WINDOW_EXPIRED";
  }
  return null;
}

/**
 * An empty `allowedReasons` list means the policy does not restrict reasons;
 * otherwise the requested reason must be one the merchant published.
 */
export function assertAllowedReturnReason(
  policy: OrderReturnPolicySnapshotV1 | null,
  reasonCode: string,
): void {
  if (!policy || policy.allowedReasons.length === 0) return;
  if (!policy.allowedReasons.includes(reasonCode)) {
    throw new Error("ORDER_RETURN_REASON_NOT_ALLOWED");
  }
}

/**
 * Restocking fee the captured policy charges on the returned value, truncated
 * to minor units. Returns 0n when the policy charges no fee, so the refund side
 * always reads a concrete number captured together with the request.
 */
export function restockingFeeMinor(
  policy: OrderReturnPolicySnapshotV1 | null,
  returnedValueMinor: bigint,
): bigint {
  const percentage = policy?.restockingFeePercentage;
  if (!percentage) return 0n;
  const parsed = Number(percentage);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0n;
  const basisPoints = BigInt(Math.round(parsed * 100));
  return (returnedValueMinor * basisPoints) / 10_000n;
}

/**
 * Computes per-line return eligibility under the captured policy. Mirrors
 * Shopify's model: eligibility is a pre-computed fact derived from immutable
 * policy + current order state, not recomputed by the caller on the fly. The
 * quantity ceiling matches the write path, where an open request already holds
 * the quantity it asked for.
 */
export function computeReturnEligibility(
  context: ReturnEligibilityContext,
  lines: readonly ReturnEligibilityLine[],
): readonly ReturnLineEligibility[] {
  const gate = returnPolicyViolation(context);
  return lines.map((line) => {
    const fulfilledQuantity = Math.min(
      line.fulfilledQuantity,
      Math.max(0, line.quantity - line.cancelledQuantity),
    );
    const maxReturnableQuantity = Math.max(
      0,
      fulfilledQuantity - line.requestedQuantity,
    );
    let reasonCode: string | null = null;
    if (maxReturnableQuantity <= 0) reasonCode = "RETURN_QUANTITY_EXHAUSTED";
    else if (gate) reasonCode = gate;
    return {
      orderLineId: line.orderLineId,
      eligible: maxReturnableQuantity > 0 && gate === null,
      maxReturnableQuantity,
      reasonCode,
    };
  });
}

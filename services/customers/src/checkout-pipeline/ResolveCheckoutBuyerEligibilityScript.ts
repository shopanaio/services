import type { Customers } from "@shopana/broker-types";
import { BaseScript } from "../kernel/BaseScript.js";
import type { CustomersCheckoutEligibilityPort } from "./contracts.js";
import { compareEligibilityMemberships, createEligibilityRevision } from "./eligibilityRevision.js";

const MAX_SEGMENT_IDS = 500;

export class ResolveCheckoutBuyerEligibilityScript
  extends BaseScript<
    Customers.ResolveCheckoutBuyerEligibilityParams,
    Customers.ResolveCheckoutBuyerEligibilityResult
  >
  implements CustomersCheckoutEligibilityPort
{
  resolveBuyerEligibility(
    params: Customers.ResolveCheckoutBuyerEligibilityParams,
  ): Promise<Customers.ResolveCheckoutBuyerEligibilityResult> {
    return this.run(params);
  }

  protected async execute(
    params: Customers.ResolveCheckoutBuyerEligibilityParams,
  ): Promise<Customers.ResolveCheckoutBuyerEligibilityResult> {
    const read = await this.repository.checkoutEligibility.resolveBuyerEligibility({
      customerId: params.customerId,
      effectiveAt: params.effectiveAt,
    });
    if (!read) {
      return {
        ok: false,
        code: "CUSTOMER_NOT_FOUND",
        message: "Customer was not found.",
        retryable: false,
      };
    }

    if (read.customer.lifecycleStatus !== "ACTIVE") {
      return {
        ok: false,
        code: "CUSTOMER_NOT_ELIGIBLE",
        reason: read.customer.lifecycleStatus,
        message: "Customer is not eligible for checkout.",
        retryable: false,
      };
    }

    const memberships = [...read.memberships].sort(compareEligibilityMemberships);
    const segmentIds = [...new Set(memberships.map((membership) => membership.segmentId))].sort(
      (left, right) => (left < right ? -1 : left > right ? 1 : 0),
    );

    if (segmentIds.length > MAX_SEGMENT_IDS) {
      return {
        ok: false,
        code: "BUYER_ELIGIBILITY_LIMIT_EXCEEDED",
        message: "Buyer eligibility exceeds the supported segment limit.",
        retryable: false,
      };
    }

    return {
      ok: true,
      storeId: this.context.store.id,
      customerId: read.customer.id,
      effectiveAt: params.effectiveAt,
      segmentIds,
      segmentMembershipRevision: createEligibilityRevision({
        customerId: read.customer.id,
        memberships,
      }),
    };
  }

  protected handleError(_error: unknown): Customers.ResolveCheckoutBuyerEligibilityResult {
    return {
      ok: false,
      code: "BUYER_ELIGIBILITY_RESOLUTION_FAILED",
      message: "Buyer eligibility could not be resolved.",
      retryable: true,
    };
  }
}

import {
  assertCompensationRecoveryData,
  isTerminalWorkflowFailure,
  placementRecoveryAction,
} from "./CheckoutMaintenanceWorkflow.js";
import type { CheckoutPlacementRecord } from "../infrastructure/mutations/CheckoutPlacementRepository.js";

describe("checkout placement recovery decisions", () => {
  it("completes a durable placement when the original workflow succeeded", () => {
    expect(placementRecoveryAction("SUCCESS", {
      placementId: "0198c4d4-9c00-7000-8000-000000000001",
      orderId: "0198c4d4-9c00-7000-8000-000000000002",
      status: "PAID",
    })).toBe("COMPLETE");
  });

  it.each(["ERROR", "CANCELLED", "MAX_RECOVERY_ATTEMPTS_EXCEEDED"])(
    "recovers terminal workflow status %s",
    (status) => {
      expect(isTerminalWorkflowFailure(status)).toBe(true);
      expect(placementRecoveryAction(status, null)).toBe("RECOVER");
    },
  );

  it.each([undefined, "PENDING", "ENQUEUED", "SUCCESS"])(
    "waits while workflow status/output is not recoverable: %s",
    (status) => {
      expect(placementRecoveryAction(status, null)).toBe("WAIT");
    },
  );

  it("refuses to clear a compensation whose durable resource IDs are missing", () => {
    const placement = {
      orderId: null,
      requestedOrderId: null,
      discountReservationIds: [],
      discountRedemptionIds: [],
      loyaltyReservation: null,
    } as unknown as CheckoutPlacementRecord;

    expect(() => assertCompensationRecoveryData(
      placement,
      new Set(["releaseDiscountUsage"]),
    )).toThrow("CHECKOUT_COMPENSATION_DISCOUNT_RESERVATIONS_MISSING");
  });
});

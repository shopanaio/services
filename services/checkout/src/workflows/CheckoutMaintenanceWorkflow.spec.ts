import {
  isTerminalWorkflowFailure,
  placementRecoveryAction,
} from "./CheckoutMaintenanceWorkflow.js";

describe("checkout placement recovery decisions", () => {
  it("completes a durable placement when the original workflow succeeded", () => {
    expect(placementRecoveryAction("SUCCESS", {
      placementId: "0198c4d4-9c00-7000-8000-000000000001",
      orderId: "0198c4d4-9c00-7000-8000-000000000002",
      status: "PAID",
    })).toBe("COMPLETE");
  });

  it.each(["ERROR", "CANCELLED"])("recovers terminal workflow status %s", (status) => {
    expect(isTerminalWorkflowFailure(status)).toBe(true);
    expect(placementRecoveryAction(status, null)).toBe("RECOVER");
  });

  it.each([undefined, "PENDING", "ENQUEUED", "SUCCESS"])(
    "waits while workflow status/output is not recoverable: %s",
    (status) => {
      expect(placementRecoveryAction(status, null)).toBe("WAIT");
    },
  );
});

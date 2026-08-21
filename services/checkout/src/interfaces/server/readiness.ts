import { DBOS, type ServiceBroker } from "@shopana/shared-kernel";
import { rawSql } from "@event-driven-io/dumbo";
import { dumboPool } from "../../infrastructure/db/dumbo.js";
import { OrderCheckoutActions } from "@shopana/broker-types";

const criticalActions = [
  "project.getStoreById",
  "order.generateOrderId",
  OrderCheckoutActions.createFromPlacement,
  OrderCheckoutActions.confirmPlacement,
  OrderCheckoutActions.cancelPlacement,
  OrderCheckoutActions.getPlacement,
  "catalog.reserveCheckoutInventory",
  "catalog.releaseCheckoutInventory",
  "pricing.reserveCheckoutDiscountUsage",
  "pricing.commitCheckoutDiscountUsage",
  "delivery.commitCheckoutDeliverySelections",
] as const;

const criticalWorkflows = [
  "checkout.placeOrder",
  "checkout.monitorPlacedPayment",
  "checkout.maintainCheckout",
  "payments.createCollection",
  "payments.createSession",
] as const;

export async function checkoutReadiness(broker: ServiceBroker) {
  const checks: Record<string, { ok: boolean; detail?: string }> = {};
  try {
    await dumboPool.execute.query(rawSql("SELECT 1"));
    checks.postgres = { ok: true };
  } catch (error) {
    checks.postgres = { ok: false, detail: message(error) };
  }
  try {
    await DBOS.getWorkflowStatus("checkout-readiness-probe");
    checks.dbos = { ok: true };
  } catch (error) {
    checks.dbos = { ok: false, detail: message(error) };
  }
  const missingActions = criticalActions.filter((name) => !broker.hasAction(name));
  checks.brokerActions =
    missingActions.length === 0
      ? { ok: true }
      : { ok: false, detail: `Missing: ${missingActions.join(", ")}` };
  const missingWorkflows = criticalWorkflows.filter((name) => !broker.hasWorkflow(name));
  checks.brokerWorkflows =
    missingWorkflows.length === 0
      ? { ok: true }
      : { ok: false, detail: `Missing: ${missingWorkflows.join(", ")}` };
  return {
    status: Object.values(checks).every(({ ok }) => ok) ? "ok" : "not_ready",
    service: "checkout",
    ready: Object.values(checks).every(({ ok }) => ok),
    checks,
  };
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

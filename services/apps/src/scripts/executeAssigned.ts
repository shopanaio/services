import type { Apps, Notifications } from "@shopana/broker-types";
import { Domain } from "@shopana/plugin-sdk";
import type { TransactionScript } from "../kernel/types.js";

export const executeAssigned: TransactionScript<
  Apps.ExecuteAssignedParams,
  Apps.ExecuteAssignedResult
> = async (params, services) => {
  if (
    params.domain !== "notifications" ||
    params.assignment.aggregate !== "notifications" ||
    params.assignment.aggregateId !== params.capability
  ) {
    throw new Error("Invalid notification assignment route");
  }
  if (!params.idempotencyKey.trim()) {
    throw new Error("idempotencyKey is required");
  }

  const resolved =
    await services.slotsRepository.findResolvedSlotForAggregate(
      params.domain,
      params.storeId,
      params.assignment.aggregate,
      params.assignment.aggregateId,
      params.capability
    );
  if (!resolved) {
    throw new Error(
      `No active provider assigned for notification channel ${params.capability}`
    );
  }
  if (resolved.slot.config?.status !== "active") {
    throw new Error("Assigned provider configuration is not active");
  }

  const receipt = await services.pluginManager.executeOnProvider({
    domain: Domain.NOTIFICATIONS,
    operationId: params.operation,
    pluginCode: resolved.slot.provider,
    rawConfig: resolved.slot.config?.data ?? {},
    storeId: params.storeId,
    input: params.input,
    // Delivery owns retry. Apps still applies timeout/rate-limit/circuit-breaker.
    retries: params.operation === "deliver" ? 0 : undefined,
  });
  return {
    providerCode: resolved.slot.provider,
    slotId: resolved.slot.id,
    assignmentId: resolved.assignment.id,
    receipt: receipt as
      | Notifications.NotificationDeliveryReceipt
      | Notifications.NotificationProviderTestResult,
  };
};

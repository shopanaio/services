import { Injectable } from "@nestjs/common";
import type { Apps, Notifications } from "@shopana/broker-types";
import {
  BrokerWorkflows,
  DBOS,
  InjectBroker,
  ServiceBroker,
  Workflow,
  WorkflowStep,
} from "@shopana/shared-kernel";
import { Kernel } from "../kernel/Kernel.js";
import {
  DeliveryExecutionScript,
  type DeliveryExecutionParams,
  type DeliveryExecutionResult,
} from "../scripts/index.js";
import type { DeliveryWorkflowInput } from "./types.js";

const RECONCILE_DELAYS_MS = [
  60_000,
  300_000,
  1_800_000,
  7_200_000,
  28_800_000,
  86_400_000,
] as const;

@Injectable()
export class NotificationDeliveryReconcileWorkflow extends BrokerWorkflows {
  constructor(@InjectBroker("notifications") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("reconcileDelivery")
  async run(input: DeliveryWorkflowInput): Promise<{ status: string }> {
    let lastErrorCode = "RECONCILIATION_EXHAUSTED";
    let accepted = false;
    for (const delay of RECONCILE_DELAYS_MS) {
      await DBOS.sleep(delay);
      const lookup = await this.stepScript(input, {
        operation: "getStatusLookup",
        deliveryId: input.deliveryId,
      });
      if (!("found" in lookup)) {
        throw new Error("INVALID_STATUS_LOOKUP_RESULT");
      }
      if (!lookup.found) {
        if (lookup.reason === "DELIVERY_NOT_FOUND") {
          return { status: "not-found" };
        }
        if (lookup.reason === "DELIVERY_NOT_RECONCILABLE") {
          return { status: lookup.status ?? "not-runnable" };
        }
        lastErrorCode = lookup.reason;
        continue;
      }
      accepted ||= lookup.currentStatus === "ACCEPTED";

      let result: Apps.ExecuteAssignedResult;
      try {
        result = await this.stepStatus({
          storeId: input.storeId,
          deliveryId: input.deliveryId,
          channel: lookup.channel,
          providerMessageId: lookup.providerMessageId,
          providerCode: lookup.providerCode,
          providerSlotId: lookup.providerSlotId,
        });
      } catch (error) {
        lastErrorCode = statusLookupErrorCode(error);
        continue;
      }

      const receipt = result.receipt as Notifications.NotificationDeliveryReceipt;
      if (receipt.state === "REJECTED") {
        await this.stepScript(input, {
          operation: "reconcileFailure",
          deliveryId: input.deliveryId,
          errorCode: receipt.responseCode ?? "PROVIDER_REJECTED",
        });
        return { status: "DEAD" };
      }
      if (receipt.state === "UNKNOWN") {
        lastErrorCode = "PROVIDER_STATUS_UNKNOWN";
        continue;
      }
      if (receipt.state === "ACCEPTED") {
        await this.stepScript(input, {
          operation: "reconcileSuccess",
          deliveryId: input.deliveryId,
          state: "ACCEPTED",
          providerCode: result.providerCode,
          providerSlotId: result.slotId,
          providerMessageId: receipt.providerMessageId,
          responseCode: receipt.responseCode,
        });
        accepted = true;
        lastErrorCode = "PROVIDER_STATUS_ACCEPTED";
        continue;
      }
      await this.stepScript(input, {
        operation: "reconcileSuccess",
        deliveryId: input.deliveryId,
        state: receipt.state,
        providerCode: result.providerCode,
        providerSlotId: result.slotId,
        providerMessageId: receipt.providerMessageId,
        responseCode: receipt.responseCode,
      });
      return { status: receipt.state };
    }

    if (accepted) {
      return { status: "ACCEPTED" };
    }
    await this.stepScript(input, {
      operation: "reconcileFailure",
      deliveryId: input.deliveryId,
      errorKind: "UNKNOWN",
      errorCode: `RECONCILIATION_EXHAUSTED:${lastErrorCode}`.slice(0, 128),
    });
    return { status: "DEAD" };
  }

  @WorkflowStep({
    retry: { maxAttempts: 5, intervalSeconds: 1, backoffRate: 2 },
  })
  private stepScript(
    context: DeliveryWorkflowInput,
    params: DeliveryExecutionParams
  ): Promise<DeliveryExecutionResult> {
    return Kernel.getInstance().runScript(
      DeliveryExecutionScript,
      params,
      context
    );
  }

  @WorkflowStep({ retriesAllowed: false })
  private stepStatus(input: {
    storeId: string;
    deliveryId: string;
    channel: Notifications.NotificationChannel;
    providerMessageId: string;
    providerCode: string;
    providerSlotId: string;
  }): Promise<Apps.ExecuteAssignedResult> {
    return this.broker.call("apps.executeAssigned", {
      storeId: input.storeId,
      domain: "notifications",
      capability: input.channel,
      operation: "getStatus",
      assignment: {
        aggregate: "notifications",
        aggregateId: input.channel,
      },
      expectedProvider: {
        providerCode: input.providerCode,
        slotId: input.providerSlotId,
      },
      input: {
        providerMessageId: input.providerMessageId,
        deliveryId: input.deliveryId,
      },
      idempotencyKey: `${input.deliveryId}:status`,
    } satisfies Apps.ExecuteAssignedParams);
  }
}

function statusLookupErrorCode(error: unknown): string {
  const value =
    error && typeof error === "object"
      ? (error as Record<string, unknown>)
      : {};
  const code =
    typeof value.code === "string" ? value.code : "STATUS_LOOKUP_FAILED";
  return code.replace(/[^A-Z0-9_:-]/gi, "_").slice(0, 128);
}

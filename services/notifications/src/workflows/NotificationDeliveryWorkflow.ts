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

const RETRY_DELAYS_MS: Record<Notifications.NotificationChannel, number[]> = {
  EMAIL: [60_000, 300_000, 1_800_000, 7_200_000],
  SMS: [60_000, 600_000, 3_600_000],
  WEBHOOK: [60_000, 300_000, 1_800_000, 7_200_000, 28_800_000, 86_400_000],
};

@Injectable()
export class NotificationDeliveryWorkflow extends BrokerWorkflows {
  constructor(@InjectBroker("notifications") broker: ServiceBroker) {
    super(broker);
  }

  private get kernel(): Kernel {
    return Kernel.getInstance();
  }

  @Workflow("deliver", { idempotencyStrategy: "content" })
  async run(input: DeliveryWorkflowInput): Promise<{ status: string }> {
    while (true) {
      let claimed: DeliveryExecutionResult;
      try {
        claimed = await this.stepScript(input, {
          operation: "claimAndRender",
          deliveryId: input.deliveryId,
        });
      } catch (error) {
        await this.stepScript(input, {
          operation: "recordPreflightFailure",
          deliveryId: input.deliveryId,
          errorKind: "VALIDATION",
          errorCode: toErrorCode(error),
        });
        return { status: "FAILED_PERMANENT" };
      }
      if (!("claimed" in claimed) || !claimed.claimed) {
        return { status: "not-runnable" };
      }
      const attempt = await this.stepScript(input, {
        operation: "createAttempt",
        deliveryId: input.deliveryId,
        workflowId: DBOS.workflowID ?? `notifications.deliver:${input.deliveryId}`,
      });
      if (!("attemptId" in attempt)) {
        throw new Error("NOTIFICATION_ATTEMPT_NOT_CREATED");
      }

      try {
        const execution = await this.stepDeliver({
          storeId: input.storeId,
          channel: claimed.channel,
          delivery: claimed.input,
        });
        const receipt = execution.receipt as Notifications.NotificationDeliveryReceipt;
        if (receipt.state === "ACCEPTED" || receipt.state === "DELIVERED") {
          await this.stepScript(input, {
            operation: "recordSuccess",
            deliveryId: input.deliveryId,
            attemptId: attempt.attemptId,
            providerCode: execution.providerCode,
            providerSlotId: execution.slotId,
            receipt,
          });
          return { status: receipt.state };
        }
        if (receipt.state === "UNKNOWN") {
          await this.recordUnknown(input, attempt.attemptId, {
            providerCode: execution.providerCode,
            providerSlotId: execution.slotId,
            providerMessageId: receipt.providerMessageId,
          });
          return { status: "UNKNOWN" };
        }
        await this.stepScript(input, {
          operation: "recordFailure",
          deliveryId: input.deliveryId,
          attemptId: attempt.attemptId,
          status: "FAILED_PERMANENT",
          errorKind: "PERMANENT",
          errorCode: receipt.responseCode ?? "PROVIDER_REJECTED",
          providerCode: execution.providerCode,
          providerSlotId: execution.slotId,
        });
        return { status: "FAILED_PERMANENT" };
      } catch (error) {
        const failure = classifyProviderError(error);
        if (failure.unknown) {
          await this.recordUnknown(input, attempt.attemptId, {
            errorCode: failure.code,
            diagnostics: failure.diagnostics,
          });
          return { status: "UNKNOWN" };
        }
        const delays = RETRY_DELAYS_MS[claimed.channel];
        const delay =
          failure.retryAfterMs ??
          delays[Math.min(attempt.attemptNumber - 1, delays.length - 1)];
        const retryable =
          failure.retryable && attempt.attemptNumber <= delays.length;
        if (!retryable) {
          await this.stepScript(input, {
            operation: "recordFailure",
            deliveryId: input.deliveryId,
            attemptId: attempt.attemptId,
            status: failure.retryable ? "DEAD" : failure.blocked
              ? "BLOCKED_NO_PROVIDER"
              : "FAILED_PERMANENT",
            errorKind: failure.kind,
            errorCode: failure.code,
            diagnostics: failure.diagnostics,
          });
          return {
            status: failure.retryable
              ? "DEAD"
              : failure.blocked
                ? "BLOCKED_NO_PROVIDER"
                : "FAILED_PERMANENT",
          };
        }
        const nextAttemptAt = new Date(Date.now() + delay).toISOString();
        await this.stepScript(input, {
          operation: "recordFailure",
          deliveryId: input.deliveryId,
          attemptId: attempt.attemptId,
          status: "RETRY_SCHEDULED",
          errorKind: failure.kind,
          errorCode: failure.code,
          nextAttemptAt,
          diagnostics: failure.diagnostics,
        });
        await DBOS.sleep(delay);
        await this.stepScript(input, {
          operation: "prepareRetry",
          deliveryId: input.deliveryId,
        });
      }
    }
  }

  @WorkflowStep({ retriesAllowed: false })
  private stepScript(
    context: DeliveryWorkflowInput,
    params: DeliveryExecutionParams
  ): Promise<DeliveryExecutionResult> {
    return this.kernel.runScript(DeliveryExecutionScript, params, context);
  }

  @WorkflowStep({ retriesAllowed: false })
  private stepDeliver(input: {
    storeId: string;
    channel: Notifications.NotificationChannel;
    delivery: Notifications.NotificationDeliveryInput;
  }): Promise<Apps.ExecuteAssignedResult> {
    return this.broker.call("apps.executeAssigned", {
      storeId: input.storeId,
      domain: "notifications",
      capability: input.channel,
      operation: "deliver",
      assignment: {
        aggregate: "notifications",
        aggregateId: input.channel,
      },
      input: input.delivery,
      idempotencyKey: input.delivery.idempotencyKey,
    } satisfies Apps.ExecuteAssignedParams);
  }

  private async recordUnknown(
    input: DeliveryWorkflowInput,
    attemptId: string,
    details: {
      errorCode?: string;
      providerCode?: string;
      providerSlotId?: string;
      providerMessageId?: string;
      diagnostics?: Record<string, unknown>;
    }
  ): Promise<void> {
    await this.stepScript(input, {
      operation: "recordFailure",
      deliveryId: input.deliveryId,
      attemptId,
      status: "UNKNOWN",
      errorKind: "UNKNOWN",
      ...details,
    });
  }
}

function toErrorCode(error: unknown): string {
  const value =
    error instanceof Error ? error.message : "DELIVERY_PREFLIGHT_FAILED";
  return value.replace(/[^A-Z0-9_:-]/gi, "_").slice(0, 128);
}

function classifyProviderError(error: unknown): {
  kind: string;
  code: string;
  retryable: boolean;
  blocked: boolean;
  unknown: boolean;
  retryAfterMs?: number;
  diagnostics: Record<string, unknown>;
} {
  const value =
    error && typeof error === "object"
      ? (error as Record<string, unknown>)
      : {};
  const details =
    value.details && typeof value.details === "object"
      ? (value.details as Record<string, unknown>)
      : {};
  const kind =
    typeof details.kind === "string"
      ? details.kind
      : value.code === "RATE_LIMIT"
        ? "RATE_LIMIT"
        : value.code === "TIMEOUT"
          ? "UNKNOWN"
          : value.code === "CIRCUIT_OPEN"
            ? "TEMPORARY"
            : "CONFIGURATION";
  const code =
    typeof value.code === "string" ? value.code : "PROVIDER_EXECUTION_FAILED";
  const accepted = details.acceptedByProvider === true;
  return {
    kind,
    code,
    retryable:
      details.safeToRetry === true ||
      kind === "RATE_LIMIT" ||
      kind === "TEMPORARY",
    blocked:
      kind === "CONFIGURATION" &&
      typeof value.message === "string" &&
      value.message.includes("No active provider"),
    unknown: accepted || kind === "UNKNOWN" || value.code === "TIMEOUT",
    retryAfterMs:
      typeof details.retryAfterMs === "number"
        ? details.retryAfterMs
        : undefined,
    diagnostics: {
      code,
      kind,
      plugin: value.plugin,
      operation: value.operation,
    },
  };
}

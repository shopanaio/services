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
  WEBHOOK: [
    60_000,
    300_000,
    1_800_000,
    7_200_000,
    28_800_000,
    86_400_000,
  ],
};

export type ProviderOutcome =
  | {
      status: "ACCEPTED" | "DELIVERED";
      providerCode: string;
      providerSlotId: string;
      providerMessageId?: string;
    }
  | {
      status: "UNSUPPORTED";
      providerCode: string;
      providerSlotId: string;
    }
  | {
      status:
        | "UNKNOWN"
        | "FAILED_PERMANENT"
        | "DEAD"
        | "BLOCKED_NO_PROVIDER";
      errorKind: string;
      errorCode: string;
      providerCode: string;
      providerSlotId: string;
      providerMessageId?: string;
    };

export interface NotificationProviderDeliveryInput {
  delivery: DeliveryWorkflowInput;
  claimed: Extract<DeliveryExecutionResult, { claimed: true }>;
  route: Apps.CapabilityRoute;
}

@Injectable()
export class NotificationProviderDeliveryWorkflow extends BrokerWorkflows {
  constructor(@InjectBroker("notifications") broker: ServiceBroker) {
    super(broker);
  }

  private get kernel(): Kernel {
    return Kernel.getInstance();
  }

  @Workflow("deliverProvider", { idempotencyStrategy: "workflow" })
  async run(input: NotificationProviderDeliveryInput): Promise<ProviderOutcome> {
    const { claimed, delivery, route } = input;
    const delays = RETRY_DELAYS_MS[claimed.channel];
    let providerAttemptNumber = 0;

    while (true) {
      providerAttemptNumber += 1;
      const attempt = await this.stepScript(delivery, {
        operation: "createAttempt",
        deliveryId: delivery.deliveryId,
        workflowId:
          DBOS.workflowID ??
          `notifications.deliverProvider:${delivery.deliveryId}:${route.installationId}`,
        providerCode: route.appCode,
        providerSlotId: route.installationId,
      });
      if (!("attemptId" in attempt)) {
        throw new Error("NOTIFICATION_ATTEMPT_NOT_CREATED");
      }

      try {
        const execution = await this.stepDeliver({
          storeId: delivery.storeId,
          delivery: claimed.input,
          route,
        });
        const receipt = execution.receipt;
        if (receipt.state === "UNSUPPORTED") {
          await this.stepScript(delivery, {
            operation: "recordAttemptFailure",
            attemptId: attempt.attemptId,
            errorKind: "CONFIGURATION",
            errorCode:
              receipt.responseCode ?? "PROVIDER_CHANNEL_UNSUPPORTED",
          });
          return {
            status: "UNSUPPORTED",
            providerCode: execution.providerCode,
            providerSlotId: execution.installationId,
          };
        }
        if (receipt.state === "ACCEPTED" || receipt.state === "DELIVERED") {
          await this.stepScript(delivery, {
            operation: "recordAttemptSuccess",
            attemptId: attempt.attemptId,
            receipt: {
              ...receipt,
              state: receipt.state,
            },
          });
          return {
            status: receipt.state,
            providerCode: execution.providerCode,
            providerSlotId: execution.installationId,
            providerMessageId: receipt.providerMessageId,
          };
        }
        if (receipt.state === "UNKNOWN") {
          await this.stepScript(delivery, {
            operation: "recordAttemptFailure",
            attemptId: attempt.attemptId,
            errorKind: "UNKNOWN",
            errorCode: receipt.responseCode ?? "PROVIDER_RESULT_UNKNOWN",
            providerMessageId: receipt.providerMessageId,
          });
          return {
            status: "UNKNOWN",
            errorKind: "UNKNOWN",
            errorCode: receipt.responseCode ?? "PROVIDER_RESULT_UNKNOWN",
            providerCode: execution.providerCode,
            providerSlotId: execution.installationId,
            providerMessageId: receipt.providerMessageId,
          };
        }
        await this.stepScript(delivery, {
          operation: "recordAttemptFailure",
          attemptId: attempt.attemptId,
          errorKind: "PERMANENT",
          errorCode: receipt.responseCode ?? "PROVIDER_REJECTED",
        });
        return {
          status: "FAILED_PERMANENT",
          errorKind: "PERMANENT",
          errorCode: receipt.responseCode ?? "PROVIDER_REJECTED",
          providerCode: execution.providerCode,
          providerSlotId: execution.installationId,
          providerMessageId: receipt.providerMessageId,
        };
      } catch (error) {
        const failure = classifyProviderError(error);
        if (failure.unknown) {
          await this.recordProviderFailure(delivery, {
            attemptId: attempt.attemptId,
            route,
            providerAttemptNumber,
            failure,
            retryScheduled: false,
          });
          return {
            status: "UNKNOWN",
            errorKind: "UNKNOWN",
            errorCode: failure.code,
            providerCode: route.appCode,
            providerSlotId: route.installationId,
          };
        }

        const delay =
          failure.retryAfterMs ??
          delays[Math.min(providerAttemptNumber - 1, delays.length - 1)];
        const retryScheduled =
          failure.retryable && providerAttemptNumber <= delays.length;
        const nextAttemptAt = retryScheduled
          ? new Date((await DBOS.now()) + delay).toISOString()
          : undefined;
        await this.recordProviderFailure(delivery, {
          attemptId: attempt.attemptId,
          route,
          providerAttemptNumber,
          failure,
          retryScheduled,
          ...(nextAttemptAt ? { nextAttemptAt } : {}),
        });

        if (!retryScheduled) {
          return {
            status: failure.retryable
              ? "DEAD"
              : failure.blocked
                ? "BLOCKED_NO_PROVIDER"
                : "FAILED_PERMANENT",
            errorKind: failure.kind,
            errorCode: failure.code,
            providerCode: route.appCode,
            providerSlotId: route.installationId,
          };
        }
        await DBOS.sleep(delay);
        await this.stepScript(delivery, {
          operation: "resumeProviderRetry",
          attemptId: attempt.attemptId,
        });
      }
    }
  }

  private recordProviderFailure(
    delivery: DeliveryWorkflowInput,
    input: {
      attemptId: string;
      route: Apps.CapabilityRoute;
      providerAttemptNumber: number;
      failure: ProviderFailure;
      retryScheduled: boolean;
      nextAttemptAt?: string;
    },
  ): Promise<DeliveryExecutionResult> {
    return this.stepScript(delivery, {
      operation: "recordAttemptFailure",
      attemptId: input.attemptId,
      errorKind: input.failure.unknown ? "UNKNOWN" : input.failure.kind,
      errorCode: input.failure.code,
      diagnostics: {
        ...input.failure.diagnostics,
        appCode: input.route.appCode,
        installationId: input.route.installationId,
        providerAttemptNumber: input.providerAttemptNumber,
        retryScheduled: input.retryScheduled,
      },
      ...(input.nextAttemptAt
        ? { retry: { nextAttemptAt: input.nextAttemptAt } }
        : {}),
    });
  }

  @WorkflowStep({ retriesAllowed: false })
  private stepScript(
    context: DeliveryWorkflowInput,
    params: DeliveryExecutionParams,
  ): Promise<DeliveryExecutionResult> {
    return this.kernel.runScript(DeliveryExecutionScript, params, context);
  }

  @WorkflowStep({ retriesAllowed: false })
  private stepDeliver(input: {
    storeId: string;
    delivery: Notifications.NotificationDeliveryInput;
    route: Apps.CapabilityRoute;
  }): Promise<{
    providerCode: string;
    installationId: string;
    receipt: Notifications.NotificationDeliveryReceipt;
  }> {
    return this.broker
      .call<Apps.ExecuteCapabilityResult>("apps.executeCapability", {
        storeId: input.storeId,
        capability: "notifications",
        operation: "deliver",
        installationId: input.route.installationId,
        input: input.delivery,
        correlationId: input.delivery.idempotencyKey,
      } satisfies Apps.ExecuteCapabilityParams)
      .then((result) => ({
        providerCode: result.appCode,
        installationId: result.installationId,
        receipt: result.data as Notifications.NotificationDeliveryReceipt,
      }));
  }
}

interface ProviderFailure {
  kind: string;
  code: string;
  retryable: boolean;
  blocked: boolean;
  unknown: boolean;
  retryAfterMs?: number;
  diagnostics: Record<string, unknown>;
}

function classifyProviderError(error: unknown): ProviderFailure {
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
      (value.message.includes("No active provider") ||
        value.message.includes("No active App route")),
    unknown: accepted || kind === "UNKNOWN" || value.code === "TIMEOUT",
    retryAfterMs:
      typeof details.retryAfterMs === "number"
        ? details.retryAfterMs
        : undefined,
    diagnostics: {
      code,
      kind,
      appCode: value.appCode,
      operation: value.operation,
    },
  };
}

import { Injectable } from "@nestjs/common";
import type { Apps } from "@shopana/broker-types";
import {
  BrokerWorkflows,
  DBOS,
  InjectBroker,
  RetryableError,
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
import type {
  NotificationProviderDeliveryInput,
  ProviderOutcome,
} from "./NotificationProviderDeliveryWorkflow.js";
import type { DeliveryWorkflowInput } from "./types.js";

type ProviderSuccessOutcome = Extract<
  ProviderOutcome,
  { status: "ACCEPTED" | "DELIVERED" }
>;

type ProviderFailureOutcome = Extract<
  ProviderOutcome,
  {
    status:
      | "UNKNOWN"
      | "FAILED_PERMANENT"
      | "DEAD"
      | "BLOCKED_NO_PROVIDER";
  }
>;

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
    const rendered = claimed;

    let routes: Apps.CapabilityRoute[];
    try {
      routes = await this.stepListRoutes({
        storeId: input.storeId,
        operation: "deliver",
      });
    } catch (error) {
      const attempt = await this.stepScript(input, {
        operation: "createAttempt",
        deliveryId: input.deliveryId,
        workflowId:
          DBOS.workflowID ?? `notifications.deliver:${input.deliveryId}`,
      });
      if (!("attemptId" in attempt)) {
        throw new Error("NOTIFICATION_ATTEMPT_NOT_CREATED");
      }
      await this.stepScript(input, {
        operation: "recordAttemptFailure",
        attemptId: attempt.attemptId,
        errorKind: "TEMPORARY",
        errorCode: "CAPABILITY_DISCOVERY_FAILED",
        diagnostics: {
          cause: toErrorCode(error),
        },
      });
      await this.stepScript(input, {
        operation: "finalizeFailure",
        deliveryId: input.deliveryId,
        status: "DEAD",
        errorKind: "TEMPORARY",
        errorCode: "CAPABILITY_DISCOVERY_FAILED",
      });
      return { status: "DEAD" };
    }
    if (routes.length === 0) {
      const attempt = await this.stepScript(input, {
        operation: "createAttempt",
        deliveryId: input.deliveryId,
        workflowId:
          DBOS.workflowID ?? `notifications.deliver:${input.deliveryId}`,
      });
      if (!("attemptId" in attempt)) {
        throw new Error("NOTIFICATION_ATTEMPT_NOT_CREATED");
      }
      await this.stepScript(input, {
        operation: "recordAttemptFailure",
        attemptId: attempt.attemptId,
        errorKind: "CONFIGURATION",
        errorCode: "NO_ACTIVE_NOTIFICATION_PROVIDER",
      });
      await this.stepScript(input, {
        operation: "finalizeFailure",
        deliveryId: input.deliveryId,
        status: "BLOCKED_NO_PROVIDER",
        errorKind: "CONFIGURATION",
        errorCode: "NO_ACTIVE_NOTIFICATION_PROVIDER",
      });
      return { status: "BLOCKED_NO_PROVIDER" };
    }

    const workflowId = DBOS.workflowID;
    if (!workflowId) {
      throw new Error("NOTIFICATION_DELIVERY_WORKFLOW_ID_MISSING");
    }
    const outcomes = await Promise.all(
      routes.map((route) =>
        this.broker.runWorkflow<
          ProviderOutcome,
          NotificationProviderDeliveryInput
        >(
          "notifications.deliverProvider",
          {
            delivery: input,
            claimed: rendered,
            route,
          },
          {
            source: "workflow",
            organizationId: input.organizationId,
            workflowId,
            stepId: "notifications.deliverProvider",
            callId: route.installationId,
          },
        ),
      ),
    );
    return this.finalize(input, outcomes);
  }

  private async finalize(
    input: DeliveryWorkflowInput,
    outcomes: readonly ProviderOutcome[],
  ): Promise<{ status: string }> {
    const eligible = outcomes.filter(
      (outcome) => outcome.status !== "UNSUPPORTED",
    );
    if (eligible.length === 0) {
      await this.stepScript(input, {
        operation: "finalizeFailure",
        deliveryId: input.deliveryId,
        status: "BLOCKED_NO_PROVIDER",
        errorKind: "CONFIGURATION",
        errorCode: "NO_PROVIDER_SUPPORTS_CHANNEL",
      });
      return { status: "BLOCKED_NO_PROVIDER" };
    }

    const successful = eligible.filter(
      (outcome): outcome is ProviderSuccessOutcome =>
        outcome.status === "ACCEPTED" ||
        outcome.status === "DELIVERED",
    );
    if (successful.length === eligible.length) {
      const state =
        successful.every((outcome) => outcome.status === "DELIVERED")
          ? "DELIVERED"
          : "ACCEPTED";
      const provider = eligible.length === 1 ? successful[0] : undefined;
      await this.stepScript(input, {
        operation: "finalizeSuccess",
        deliveryId: input.deliveryId,
        state,
        providerCode: provider?.providerCode,
        providerSlotId: provider?.providerSlotId,
        providerMessageId: provider?.providerMessageId,
      });
      return { status: state };
    }
    if (successful.length > 0) {
      await this.stepScript(input, {
        operation: "finalizeFailure",
        deliveryId: input.deliveryId,
        status: "UNKNOWN",
        errorKind: "PARTIAL",
        errorCode: "PARTIAL_PROVIDER_FAILURE",
      });
      return { status: "UNKNOWN" };
    }

    const failure = selectAggregateFailure(
      eligible as readonly ProviderFailureOutcome[],
    );
    await this.stepScript(input, {
      operation: "finalizeFailure",
      deliveryId: input.deliveryId,
      status: failure.status,
      errorKind: failure.errorKind,
      errorCode: failure.errorCode,
      providerCode:
        eligible.length === 1 ? failure.providerCode : undefined,
      providerSlotId:
        eligible.length === 1 ? failure.providerSlotId : undefined,
      providerMessageId:
        eligible.length === 1
          ? failure.providerMessageId
          : undefined,
    });
    return { status: failure.status };
  }

  @WorkflowStep({ retriesAllowed: false })
  private stepScript(
    context: DeliveryWorkflowInput,
    params: DeliveryExecutionParams,
  ): Promise<DeliveryExecutionResult> {
    return this.kernel.runScript(DeliveryExecutionScript, params, context);
  }

  @WorkflowStep({
    retry: {
      maxAttempts: 5,
      intervalSeconds: 2,
      backoffRate: 2,
    },
  })
  private async stepListRoutes(input: {
    storeId: string;
    operation: string;
  }): Promise<Apps.CapabilityRoute[]> {
    try {
      const result =
        await this.broker.call<Apps.ListCapabilityRoutesResult>(
          "apps.listCapabilityRoutes",
          {
            storeId: input.storeId,
            capability: "notifications",
            operation: input.operation,
          } satisfies Apps.ListCapabilityRoutesParams,
        );
      return result.routes;
    } catch (error) {
      throw new RetryableError(
        "Notification capability discovery failed",
        error instanceof Error ? error : undefined,
      );
    }
  }
}

function selectAggregateFailure(
  outcomes: readonly ProviderFailureOutcome[],
): ProviderFailureOutcome {
  const fallback = outcomes[0];
  if (!fallback) {
    throw new Error("NOTIFICATION_PROVIDER_OUTCOME_MISSING");
  }
  return (
    outcomes.find((outcome) => outcome.status === "UNKNOWN") ??
    outcomes.find((outcome) => outcome.status === "DEAD") ??
    outcomes.find(
      (outcome) => outcome.status === "FAILED_PERMANENT",
    ) ??
    fallback
  );
}

function toErrorCode(error: unknown): string {
  const value =
    error instanceof Error ? error.message : "DELIVERY_PREFLIGHT_FAILED";
  return value.replace(/[^A-Z0-9_:-]/gi, "_").slice(0, 128);
}

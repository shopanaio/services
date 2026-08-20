import { Injectable } from "@nestjs/common";
import type {
  CustomerLifecycleJobCompletedEvent,
  CustomerLifecycleJobDispatchedEvent,
  EventHandlerDelivery,
  EventHandlerResponse,
} from "@shopana/events";
import { EventHandler, EventHandlers, InjectBroker, ServiceBroker } from "@shopana/shared-kernel";
import { Kernel } from "../kernel/Kernel.js";
import {
  CustomerLifecycleJobEventScript,
  type CustomerLifecycleJobEventParams,
  type CustomerLifecycleJobEventResult,
} from "../scripts/lifecycle/CustomerLifecycleJobEventScript.js";

@Injectable()
export class CustomerLifecycleJobEventHandlers extends EventHandlers {
  constructor(@InjectBroker("customers") broker: ServiceBroker) {
    super(broker);
  }

  @EventHandler("customerLifecycleJobDispatched", {
    retry: { maxAttempts: 5 },
  })
  handleDispatched(params: {
    event: CustomerLifecycleJobDispatchedEvent;
    delivery: EventHandlerDelivery;
  }) {
    return this.apply(params.event, params.delivery, {
      operation: "DISPATCHED",
      jobType: params.event.payload.jobType,
      aggregateId: params.event.payload.aggregateId,
      jobId: params.event.payload.jobId,
      occurredAt: params.event.payload.dispatchedAt,
    });
  }

  @EventHandler("customerLifecycleJobCompleted", {
    retry: { maxAttempts: 5 },
  })
  handleCompleted(params: {
    event: CustomerLifecycleJobCompletedEvent;
    delivery: EventHandlerDelivery;
  }) {
    const { payload } = params.event;
    return this.apply(params.event, params.delivery, {
      operation: "COMPLETED",
      jobType: payload.jobType,
      aggregateId: payload.aggregateId,
      jobId: payload.jobId,
      occurredAt: payload.completedAt,
      outcome: payload.outcome,
      resolution: payload.resolution,
      resultFileId: payload.resultFileId,
      errorCode: payload.errorCode,
      errorMessage: payload.errorMessage,
    });
  }

  private async apply(
    event: CustomerLifecycleJobDispatchedEvent | CustomerLifecycleJobCompletedEvent,
    delivery: EventHandlerDelivery,
    params: CustomerLifecycleJobEventParams,
  ): Promise<EventHandlerResponse<CustomerLifecycleJobEventResult>> {
    try {
      const data = await Kernel.getInstance().runScript(CustomerLifecycleJobEventScript, params, {
        storeId: event.payload.storeId,
        organizationId: event.context.organizationId,
        requestId: delivery.idempotencyKey,
      });
      return { success: true, data };
    } catch (error) {
      const value = error as {
        message?: unknown;
        code?: unknown;
        retryable?: unknown;
      };
      return {
        success: false,
        error: {
          message:
            typeof value?.message === "string"
              ? value.message
              : "Customer lifecycle job event failed",
          ...(typeof value?.code === "string" ? { code: value.code } : {}),
          retryable: typeof value?.retryable === "boolean" ? value.retryable : true,
        },
      };
    }
  }
}

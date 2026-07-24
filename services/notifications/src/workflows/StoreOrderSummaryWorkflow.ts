import { Injectable } from "@nestjs/common";
import type { Orders } from "@shopana/broker-types";
import type { ContextStore } from "@shopana/shared-context";
import {
  BrokerWorkflows,
  DBOS,
  InjectBroker,
  ServiceBroker,
  Workflow,
  WorkflowStep,
} from "@shopana/shared-kernel";

export interface StoreOrderSummaryWorkflowInput {
  storeId: string;
  organizationId: string;
  periodStart: string;
  periodEnd: string;
}

type GetStoreByIdResult = {
  store: ContextStore | null;
  userErrors: Array<{ message: string }>;
};

@Injectable()
export class StoreOrderSummaryWorkflow extends BrokerWorkflows {
  constructor(@InjectBroker("notifications") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("storeOrderSummaryDispatch", {
    idempotencyStrategy: "content",
  })
  async run(
    input: StoreOrderSummaryWorkflowInput
  ): Promise<{ workflowId?: string; skipped?: string }> {
    const store = await this.stepGetStore(input.storeId);
    const summary = await this.stepGetSummary({
      storeId: input.storeId,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      currencyCode: store.currencyCode,
    });
    const idempotencyKey = [
      "staff.order.summary",
      input.storeId,
      input.periodStart,
      input.periodEnd,
    ].join(":");
    const started = await this.stepStartNotification({
      store,
      input,
      summary,
      idempotencyKey,
    });
    return { workflowId: started };
  }

  @WorkflowStep({
    retry: { maxAttempts: 5, intervalSeconds: 1, backoffRate: 2 },
  })
  private async stepGetStore(storeId: string): Promise<ContextStore> {
    const result = await this.broker.call<
      GetStoreByIdResult,
      { id: string }
    >("project.getStoreById", { id: storeId });
    if (!result.store) {
      throw new Error(
        result.userErrors[0]?.message ?? `Store ${storeId} was not found`
      );
    }
    return result.store;
  }

  @WorkflowStep({
    retry: { maxAttempts: 5, intervalSeconds: 1, backoffRate: 2 },
  })
  private stepGetSummary(
    input: Orders.GetStoreOrderSummaryParams
  ): Promise<Orders.GetStoreOrderSummaryResult> {
    return this.broker.call("order.getStoreOrderSummary", input);
  }

  @WorkflowStep({ retriesAllowed: false })
  private async stepStartNotification(input: {
    store: ContextStore;
    input: StoreOrderSummaryWorkflowInput;
    summary: Orders.GetStoreOrderSummaryResult;
    idempotencyKey: string;
  }): Promise<string> {
    const started = await this.broker.startWorkflow(
      "notifications.enqueue",
      {
        storeId: input.store.id,
        organizationId: input.input.organizationId,
        key: "staff.order.summary",
        data: {
          store: {
            id: input.store.id,
            displayName: input.store.displayName,
            defaultLocale: input.store.defaultLocale,
            timezone: input.store.timezone,
          },
          summary: {
            periodStart: input.summary.periodStart,
            periodEnd: input.summary.periodEnd,
            orderCount: input.summary.orderCount,
            total: {
              amount: input.summary.totalAmount,
              currencyCode: input.summary.currencyCode,
            },
          },
        },
        locale: input.store.defaultLocale,
        idempotencyKey: input.idempotencyKey,
        subject: {
          type: "store",
          id: input.store.id,
        },
        correlationId: input.idempotencyKey,
        sourceService: "notifications",
      },
      {
        source: "workflow",
        organizationId: input.input.organizationId,
        workflowId:
          DBOS.workflowID ??
          `notifications.storeOrderSummary:${input.idempotencyKey}`,
        stepId: "notifications.enqueueStoreOrderSummary",
        callId: input.idempotencyKey,
      }
    );
    return started.workflowId;
  }
}

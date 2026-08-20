import { Injectable } from "@nestjs/common";
import type { LoyaltyPointsAdjustedEvent } from "@shopana/events";
import type { ContextStore } from "@shopana/shared-context";
import {
  BrokerWorkflows,
  DBOS,
  InjectBroker,
  type ServiceBroker,
  Workflow,
  WorkflowStep,
} from "@shopana/shared-kernel";
import { AccountLifecycleService } from "../application/accounts/AccountLifecycleService.js";
import { parsePositive } from "../application/math.js";
import { runWithContext, ServiceContext } from "../context/index.js";
import { Kernel } from "../kernel/Kernel.js";
import { Loader } from "../loaders/Loader.js";

export interface ManualLoyaltyAdjustmentInput {
  storeId: string;
  accountId: string;
  expectedBalanceRevision: number;
  points: string;
  direction: "CREDIT" | "DEBIT";
  reasonCode: string;
  description?: string;
  actorId: string;
  occurredAt: string;
  idempotencyKey: string;
  requestHash: string;
  expiresAt?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface ManualLoyaltyAdjustmentResult {
  transactionId: string;
  accountId: string;
  availablePoints: string;
}

type GetStoreByIdResult = {
  store: ContextStore | null;
  userErrors: readonly { message: string }[];
};

@Injectable()
export class ManualAdjustmentWorkflow extends BrokerWorkflows<
  ManualLoyaltyAdjustmentInput,
  ManualLoyaltyAdjustmentResult
> {
  constructor(@InjectBroker("loyalty") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("adjustPoints")
  async run(input: ManualLoyaltyAdjustmentInput): Promise<ManualLoyaltyAdjustmentResult> {
    const executed = await this.stepAdjust(input);
    await this.broker.runWorkflow(
      "events.emit",
      {
        eventType: "loyaltyPointsAdjusted",
        payload: executed.payload,
        context: { organizationId: executed.store.organizationId },
        subject: { type: "loyaltyAccount", id: input.accountId },
        actor: { type: "user", id: input.actorId },
        emitKey: `loyalty-account:${input.accountId}`,
      },
      {
        source: "workflow",
        workflowId: DBOS.workflowID!,
        stepId: "emit:loyaltyPointsAdjusted",
        callId: executed.result.transactionId,
        organizationId: executed.store.organizationId,
      },
    );
    return executed.result;
  }

  @WorkflowStep({ retry: { maxAttempts: 5, intervalSeconds: 1, backoffRate: 2 } })
  private async stepAdjust(input: ManualLoyaltyAdjustmentInput) {
    if (!/^[0-9a-f]{64}$/.test(input.requestHash)) {
      throw new Error("Manual loyalty adjustment requestHash must be a lowercase SHA-256 hash");
    }
    const resolved = await this.broker.call<GetStoreByIdResult, { id: string }>(
      "project.getStoreById",
      { id: input.storeId },
    );
    if (!resolved.store) {
      throw new Error(resolved.userErrors[0]?.message ?? `Store ${input.storeId} was not found`);
    }
    const store = resolved.store;
    const kernel = Kernel.getInstance();
    const adjusted = await runWithContext(
      new ServiceContext({
        requestId: input.idempotencyKey,
        kernel,
        loaders: new Loader(kernel.repository),
        store,
        locale: store.defaultLocale,
        currency: store.currencyCode,
      }),
      async () => {
        const account = await kernel.repository.account.findById(input.accountId);
        if (!account) throw new Error(`Loyalty account ${input.accountId} was not found`);
        const operation = await new AccountLifecycleService(kernel.repository).adjust({
          ...input,
          points: parsePositive(input.points),
        });
        const payload: LoyaltyPointsAdjustedEvent["payload"] = {
          schemaVersion: 1,
          storeId: input.storeId,
          programId: account.programId,
          programVersionId: null,
          accountId: account.id,
          customerId: account.customerId,
          transactionId: operation.transaction.id,
          points: input.points,
          occurredAt: input.occurredAt,
          direction: input.direction,
          reasonCode: input.reasonCode,
          actorId: input.actorId,
        };
        return {
          result: {
            transactionId: operation.transaction.id,
            accountId: account.id,
            availablePoints: operation.balance.availablePoints.toString(),
          },
          payload,
        };
      },
    );
    return { ...adjusted, store };
  }
}

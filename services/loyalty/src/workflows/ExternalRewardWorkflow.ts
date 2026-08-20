import { Injectable } from "@nestjs/common";
import type { ContextStore } from "@shopana/shared-context";
import {
  BrokerWorkflows,
  InjectBroker,
  type ServiceBroker,
  Workflow,
  WorkflowStep,
} from "@shopana/shared-kernel";
import {
  OrderRewardService,
  type ExternalRewardInput,
} from "../application/earning/OrderRewardService.js";
import { LoyaltyDomainError } from "../application/errors.js";
import { runWithContext, ServiceContext } from "../context/index.js";
import { Kernel } from "../kernel/Kernel.js";
import { Loader } from "../loaders/Loader.js";

type GetStoreByIdResult = {
  store: ContextStore | null;
  userErrors: readonly { message: string }[];
};

export type ExternalRewardWorkflowResult =
  { success: true } | { success: false; message: string; retryable: false };

@Injectable()
export class ExternalRewardWorkflow extends BrokerWorkflows<
  ExternalRewardInput,
  ExternalRewardWorkflowResult
> {
  constructor(@InjectBroker("loyalty") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("processExternalReward")
  async run(input: ExternalRewardInput): Promise<ExternalRewardWorkflowResult> {
    return this.stepIngest(input);
  }

  @WorkflowStep({ retry: { maxAttempts: 10, intervalSeconds: 1, backoffRate: 2 } })
  private async stepIngest(input: ExternalRewardInput): Promise<ExternalRewardWorkflowResult> {
    const result = await this.broker.call<GetStoreByIdResult, { id: string }>(
      "project.getStoreById",
      { id: input.storeId },
    );
    if (!result.store) {
      throw new Error(result.userErrors[0]?.message ?? `Store ${input.storeId} was not found`);
    }
    const kernel = Kernel.getInstance();
    const store = result.store;
    try {
      await runWithContext(
        new ServiceContext({
          requestId: input.externalEventId,
          kernel,
          loaders: new Loader(kernel.repository),
          store,
          locale: store.defaultLocale,
          currency: store.currencyCode,
        }),
        () => new OrderRewardService(kernel.repository).ingestExternal(input),
      );
      return { success: true };
    } catch (error) {
      if (error instanceof LoyaltyDomainError && !error.retryable) {
        return { success: false, message: error.message, retryable: false };
      }
      throw error;
    }
  }
}

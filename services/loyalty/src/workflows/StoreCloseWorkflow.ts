import { Injectable } from "@nestjs/common";
import type { ContextStore } from "@shopana/shared-context";
import {
  BrokerWorkflows,
  InjectBroker,
  type ServiceBroker,
  Workflow,
  WorkflowStep,
} from "@shopana/shared-kernel";
import { AccountLifecycleService } from "../application/accounts/AccountLifecycleService.js";
import { runWithContext, ServiceContext } from "../context/index.js";
import { Kernel } from "../kernel/Kernel.js";
import { Loader } from "../loaders/Loader.js";

export interface StoreCloseInput {
  storeId: string;
  organizationId: string;
  occurredAt: string;
  eventId: string;
}

@Injectable()
export class StoreCloseWorkflow extends BrokerWorkflows<
  StoreCloseInput,
  { closedAccounts: number }
> {
  constructor(@InjectBroker("loyalty") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("closeStore")
  async run(input: StoreCloseInput): Promise<{ closedAccounts: number }> {
    return { closedAccounts: await this.stepClose(input) };
  }

  @WorkflowStep({ retry: { maxAttempts: 10, intervalSeconds: 1, backoffRate: 2 } })
  private async stepClose(input: StoreCloseInput): Promise<number> {
    const kernel = Kernel.getInstance();
    const deletedStore = {
      id: input.storeId,
      organizationId: input.organizationId,
      name: "deleted",
      displayName: "Deleted store",
      timezone: "UTC",
      email: null,
      defaultLocale: "en",
      currencyCode: "USD",
      locales: ["en"],
    } satisfies ContextStore;
    return runWithContext(
      new ServiceContext({
        requestId: input.eventId,
        kernel,
        loaders: new Loader(kernel.repository),
        store: deletedStore,
      }),
      () => new AccountLifecycleService(kernel.repository).closeStore(input.occurredAt),
    );
  }
}

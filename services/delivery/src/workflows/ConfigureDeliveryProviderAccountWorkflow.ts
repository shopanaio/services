import { Injectable } from "@nestjs/common";
import type { Delivery } from "@shopana/broker-types";
import {
  BrokerWorkflows,
  DBOS,
  InjectBroker,
  type ServiceBroker,
  Workflow,
  WorkflowStep,
} from "@shopana/shared-kernel";
import { DeliveryProviderAccountService } from "../application/providers/DeliveryProviderAccountService.js";

export interface ConfigureDeliveryProviderAccountWorkflowInput {
  params: Delivery.ConfigureDeliveryProviderAccountParams;
  providerAccountId: string;
}

@Injectable()
export class ConfigureDeliveryProviderAccountWorkflow extends BrokerWorkflows<
  ConfigureDeliveryProviderAccountWorkflowInput,
  Delivery.ConfigureDeliveryProviderAccountResult
> {
  constructor(
    @InjectBroker("delivery") broker: ServiceBroker,
    private readonly accounts: DeliveryProviderAccountService,
  ) {
    super(broker);
  }

  @Workflow("configureProviderAccount", { idempotencyStrategy: "content" })
  async run(input: ConfigureDeliveryProviderAccountWorkflowInput) {
    const result = await this.configure(input);
    return { ...result, workflowId: DBOS.workflowID! };
  }

  @WorkflowStep()
  private configure(input: ConfigureDeliveryProviderAccountWorkflowInput) {
    return this.accounts.configure(input.params, input.providerAccountId);
  }
}

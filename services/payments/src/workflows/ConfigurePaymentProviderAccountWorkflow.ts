import { Injectable } from "@nestjs/common";
import type { Payments } from "@shopana/broker-types";
import { BrokerWorkflows, DBOS, InjectBroker, type ServiceBroker, Workflow, WorkflowStep } from "@shopana/shared-kernel";
import { PaymentProviderAccountService } from "../application/PaymentProviderAccountService.js";

export interface ConfigurePaymentProviderAccountWorkflowInput {
  params: Payments.ConfigurePaymentProviderAccountParams;
  providerAccountId: string;
}

@Injectable()
export class ConfigurePaymentProviderAccountWorkflow extends BrokerWorkflows<ConfigurePaymentProviderAccountWorkflowInput, Payments.ConfigurePaymentProviderAccountResult> {
  constructor(@InjectBroker("payments") broker: ServiceBroker, private readonly accounts: PaymentProviderAccountService) { super(broker); }

  @Workflow("configureProviderAccount", { idempotencyStrategy: "content" })
  async run(input: ConfigurePaymentProviderAccountWorkflowInput) { const result = await this.configure(input); return { ...result, workflowId: DBOS.workflowID! }; }

  @WorkflowStep()
  private configure(input: ConfigurePaymentProviderAccountWorkflowInput) { return this.accounts.configure(input.params, input.providerAccountId); }
}

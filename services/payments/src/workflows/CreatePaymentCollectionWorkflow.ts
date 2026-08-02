import { Injectable } from "@nestjs/common";
import type { Payments } from "@shopana/broker-types";
import {
  BrokerWorkflows,
  DBOS,
  InjectBroker,
  type ServiceBroker,
  Workflow,
  WorkflowStep,
} from "@shopana/shared-kernel";
import { PaymentLifecycleService } from "../application/PaymentLifecycleService.js";

@Injectable()
export class CreatePaymentCollectionWorkflow extends BrokerWorkflows<
  Payments.CreatePaymentCollectionParams,
  Payments.CreatePaymentCollectionResult
> {
  constructor(
    @InjectBroker("payments") broker: ServiceBroker,
    private readonly lifecycle: PaymentLifecycleService,
  ) {
    super(broker);
  }

  @Workflow("createCollection", { idempotencyStrategy: "workflow" })
  async run(
    input: Payments.CreatePaymentCollectionParams,
  ): Promise<Payments.CreatePaymentCollectionResult> {
    const created = await this.create(input);
    return {
      paymentCollectionId: created.collection.paymentCollectionId,
      workflowId: DBOS.workflowID!,
      duplicate: created.duplicate,
    };
  }

  @WorkflowStep()
  private create(input: Payments.CreatePaymentCollectionParams) {
    return this.lifecycle.createCollection(input);
  }
}

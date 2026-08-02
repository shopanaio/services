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
export class ExpirePaymentSessionWorkflow extends BrokerWorkflows<
  Payments.ExpirePaymentParams,
  Payments.PaymentOperationAcceptedResult
> {
  constructor(
    @InjectBroker("payments") broker: ServiceBroker,
    private readonly lifecycle: PaymentLifecycleService,
  ) {
    super(broker);
  }

  @Workflow("expireSession", { idempotencyStrategy: "workflow" })
  async run(
    input: Payments.ExpirePaymentParams,
  ): Promise<Payments.PaymentOperationAcceptedResult> {
    const expired = await this.expire(input);
    return {
      paymentCollectionId: expired.collection.paymentCollectionId,
      paymentSessionId: expired.session.paymentSessionId,
      operationId: expired.operation.operationId,
      workflowId: DBOS.workflowID!,
      duplicate: expired.duplicate,
    };
  }

  @WorkflowStep()
  private expire(input: Payments.ExpirePaymentParams) {
    return this.lifecycle.expireSession(input);
  }
}

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
import type { PreparedPaymentSession } from "../infrastructure/db/PaymentLifecycleRepository.js";

@Injectable()
export class CreatePaymentSessionWorkflow extends BrokerWorkflows<
  Payments.CreatePaymentSessionParams,
  Payments.CreatePaymentSessionResult
> {
  constructor(
    @InjectBroker("payments") broker: ServiceBroker,
    private readonly lifecycle: PaymentLifecycleService,
  ) {
    super(broker);
  }

  @Workflow("createSession", { idempotencyStrategy: "workflow" })
  async run(
    input: Payments.CreatePaymentSessionParams,
  ): Promise<Payments.CreatePaymentSessionResult> {
    const prepared = await this.prepare(input);
    if (prepared.operation.state === "PROCESSING") {
      const providerResult = await this.invokeProvider(prepared);
      await this.complete(prepared, providerResult);
    }
    return {
      paymentCollectionId: prepared.collection.paymentCollectionId,
      paymentSessionId: prepared.session.paymentSessionId,
      operationId: prepared.operation.operationId,
      workflowId: DBOS.workflowID!,
      duplicate: prepared.duplicate,
    };
  }

  @WorkflowStep()
  private prepare(input: Payments.CreatePaymentSessionParams) {
    return this.lifecycle.prepareSession(input);
  }

  @WorkflowStep({
    timeoutMs: 125_000,
    retry: { maxAttempts: 5, intervalSeconds: 1, backoffRate: 2 },
  })
  private invokeProvider(prepared: PreparedPaymentSession) {
    return this.lifecycle.invokeProvider(prepared);
  }

  @WorkflowStep()
  private complete(
    prepared: PreparedPaymentSession,
    result: Payments.PaymentProviderOperationResult,
  ) {
    return this.lifecycle.completeInitialOperation(prepared, result);
  }
}

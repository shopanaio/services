import type { Checkout, Payments } from "@shopana/broker-types";
import { CheckoutCompletionActions } from "@shopana/broker-types";
import type { ServiceBroker } from "@shopana/shared-kernel";
import type { PaymentSettlementConfirmationPort } from "../../contracts/ports.js";
import { PaymentSettlementConfirmationSchema } from "../../contracts/schemas.js";

export class BrokerPaymentSettlementConfirmationAdapter implements PaymentSettlementConfirmationPort {
  constructor(private readonly broker: ServiceBroker) {}

  async confirm(
    input: Readonly<{
      collection: Payments.PaymentCollectionSnapshot;
      session: Payments.PaymentSessionSnapshot;
      operation: Payments.PaymentOperationSnapshot;
      correlationId: string;
      deadlineAt: string;
    }>,
  ): Promise<Payments.PaymentSettlementConfirmation> {
    const result = await this.broker.call<
      Checkout.ConfirmPaymentSettlementResult,
      Checkout.ConfirmPaymentSettlementParams
    >(CheckoutCompletionActions.confirmPaymentSettlement, {
      organizationId: input.collection.organizationId,
      storeId: input.collection.storeId,
      checkoutId: input.collection.checkoutId,
      orderId: input.collection.orderId,
      paymentCollectionId: input.collection.paymentCollectionId,
      paymentSessionId: input.session.paymentSessionId,
      operationId: input.operation.operationId,
      finalQuoteRevision: input.collection.basedOnFinalQuoteRevision,
      deadlineAt: input.deadlineAt,
      correlationId: input.correlationId,
    });
    return PaymentSettlementConfirmationSchema.parse(
      result,
    ) as Payments.PaymentSettlementConfirmation;
  }
}

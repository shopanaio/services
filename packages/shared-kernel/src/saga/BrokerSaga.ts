/**
 * @file BrokerSaga
 * @description Saga base class with broker integration
 */

import { BaseSaga, type SagaResult } from "@shopana/dbos";
import type { ServiceBroker } from "../broker/ServiceBroker.js";

/**
 * Saga base class with broker integration.
 *
 * Extends BaseSaga from @shopana/dbos and adds:
 * - Access to ServiceBroker for inter-service calls
 * - Automatic service name resolution from broker
 *
 * Use this class when your saga needs to call other services via broker.
 * For sagas that don't need broker integration, use BaseSaga directly.
 *
 * @example
 * class OrderSaga extends BrokerSaga<OrderInput, OrderResult> {
 *   constructor(broker: ServiceBroker) {
 *     super(broker);
 *   }
 *
 *   @Saga('createOrder')
 *   async run(input: OrderInput): Promise<SagaResult<OrderResult>> {
 *     const reservation = await this.reserveInventory(input);
 *
 *     // Call another service via broker
 *     const payment = await this.broker.call('payments.charge', {
 *       amount: input.amount,
 *       reservationId: reservation.id,
 *     });
 *
 *     return { orderId: payment.orderId };
 *   }
 * }
 */
export abstract class BrokerSaga<TInput, TOutput> extends BaseSaga<TInput, TOutput> {
  constructor(public readonly broker: ServiceBroker) {
    super(
      broker.getWorkflowRegistry(),
      broker["options"].serviceName,
    );
  }

  /** Saga entry point - must be decorated with @Saga("name") */
  abstract run(input: TInput): Promise<SagaResult<TOutput>>;
}

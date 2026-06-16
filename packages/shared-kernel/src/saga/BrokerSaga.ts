/**
 * @file BrokerSaga Base Class
 * @description Saga base class with broker integration
 */

import { BaseSaga } from "@shopana/dbos";
import type { ServiceBroker } from "../broker/ServiceBroker.js";

/**
 * Saga base class with broker integration.
 *
 * Extends BaseSaga from @shopana/dbos and adds:
 * - Access to ServiceBroker for inter-service calls
 * - Automatic service name resolution from broker
 *
 * @example
 * class OrderSaga extends BrokerSaga<OrderInput, OrderOutput> {
 *   constructor(broker: ServiceBroker) {
 *     super(broker);
 *   }
 *
 *   @Saga("createOrder")
 *   async run(input: OrderInput): Promise<OrderOutput> {
 *     const reservation = await this.reserveInventory(input);
 *     const payment = await this.processPayment(input, reservation);
 *     return { orderId: payment.orderId };
 *   }
 *
 *   @SagaStep()
 *   private async reserveInventory(input: OrderInput) { ... }
 *
 *   private async compensateReserveInventory(input: OrderInput) { ... }
 * }
 */
export abstract class BrokerSaga<TInput, TOutput> extends BaseSaga<TInput, TOutput> {
  constructor(public readonly broker: ServiceBroker) {
    super(
      broker.getWorkflowRegistry(),
      broker["options"].serviceName,
    );
  }
}

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { InjectBroker, ServiceBroker, type BrokerCallContext } from '@shopana/shared-kernel';
import {
  CheckoutCompletionActionNames,
  InventoryCheckoutActions,
  type Checkout,
  type Inventory,
} from '@shopana/broker-types';
import { FastifyInstance } from 'fastify';
import 'reflect-metadata';
import { App } from './ioc/container';
import { startServer } from './interfaces/server/server';

@Injectable()
export class CheckoutNestService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CheckoutNestService.name);
  private app!: App;
  private graphqlServer!: FastifyInstance;

  constructor(@InjectBroker('checkout') private readonly broker: ServiceBroker) {}

  async onModuleInit() {
    this.app = App.create(this.broker as any);

    this.broker.register('getById', async (params: any) => {
      return this.app.checkoutUsecase.getCheckoutDtoById.execute(params);
    });

    this.broker.register(CheckoutCompletionActionNames.get, async (params: any) => {
      return this.app.checkoutUsecase.getCheckoutCompletion.execute(params);
    });

    this.broker.register(
      CheckoutCompletionActionNames.confirmPaymentSettlement,
      async (
        params: Checkout.ConfirmPaymentSettlementParams,
        context: BrokerCallContext,
      ): Promise<Checkout.ConfirmPaymentSettlementResult> => {
        if (context.caller.kind !== 'action' || context.caller.service !== 'payments' || context.app) {
          throw new Error('PAYMENT_SETTLEMENT_CALLER_INVALID');
        }
        const confirmedAt = new Date().toISOString();
        const confirmationId = createHash('sha256').update(JSON.stringify({
          checkoutId: params.checkoutId,
          orderId: params.orderId,
          paymentSessionId: params.paymentSessionId,
          operationId: params.operationId,
          expectedCheckoutVersion: params.expectedCheckoutVersion,
          finalQuoteRevision: params.finalQuoteRevision,
        })).digest('hex');
        const completion = await this.app.checkoutUsecase.getCheckoutCompletion.execute({
          checkoutId: params.checkoutId,
          storeId: params.storeId,
        });
        if (
          !completion ||
          !completion.valid ||
          completion.checkoutVersion !== params.expectedCheckoutVersion ||
          completion.quoteRevision !== params.finalQuoteRevision ||
          Date.parse(params.deadlineAt) <= Date.parse(confirmedAt)
        ) {
          return {
            decision: 'REJECTED',
            confirmationId,
            confirmedAt,
            failure: {
              category: 'CONFLICT',
              code: 'PAYMENT_SETTLEMENT_PROVENANCE_STALE',
              message: 'Checkout, quote, or settlement deadline changed before payment confirmation.',
              retryable: false,
              providerCode: null,
            },
          };
        }
        const inventory = await this.broker.call<
          Inventory.RenewCheckoutInventoryResult,
          Inventory.RenewCheckoutInventoryParams
        >(InventoryCheckoutActions.renew, {
          storeId: params.storeId,
          orderId: params.orderId,
          expiresAt: params.deadlineAt,
        });
        const inventoryReservationRevision = inventory.renewedReservationIds.length > 0
          ? createHash('sha256')
              .update(JSON.stringify([...inventory.renewedReservationIds].sort()))
              .digest('hex')
          : null;
        return {
          decision: 'APPROVED',
          confirmationId,
          confirmedAt,
          expiresAt: params.deadlineAt,
          checkoutVersion: completion.checkoutVersion,
          finalQuoteRevision: completion.quoteRevision,
          inventoryReservationRevision,
        };
      },
    );

    this.graphqlServer = await startServer(this.broker as any);
    this.logger.log('Checkout service started');
  }

  async onModuleDestroy() {
    if (this.graphqlServer) await this.graphqlServer.close();
    this.logger.log('Checkout service stopped');
  }
}

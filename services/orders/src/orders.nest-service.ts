import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import {
  InjectBroker,
  ServiceBroker,
} from '@shopana/shared-kernel';
import 'reflect-metadata';
import { App } from './ioc/container';
import { startServer } from './interfaces/server/server';
import { v7 as uuidv7 } from 'uuid';
import { Repository } from './repositories/Repository.js';
import {
  OrderLoyaltyActionNames,
  OrderFulfillmentActionNames,
  OrderReviewActionNames,
  type PublishOrderLoyaltyRewardEligibleParams,
  type PublishOrderLoyaltyRewardEligibleResult,
  type PublishOrderLoyaltyRewardReversedParams,
  type PublishOrderLoyaltyRewardReversedResult,
  type VerifyReviewPurchaseParams,
  type VerifyReviewPurchaseResult,
  type GetOrderDeliveryShipmentPlanParams,
  type GetOrderDeliveryShipmentPlanResult,
  type ListOrderDeliveryFulfillmentOrdersParams,
  type ListOrderDeliveryFulfillmentOrdersResult,
  type ApplyOrderDeliveryShipmentUpdateParams,
  type ApplyOrderDeliveryShipmentUpdateResult,
} from '@shopana/broker-types';

@Injectable()
export class OrdersNestService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OrdersNestService.name);
  private app!: App;
  private servers!: Awaited<ReturnType<typeof startServer>>;

  constructor(
    @InjectBroker('order') private readonly broker: ServiceBroker,
    private readonly repository: Repository,
  ) {}

  async onModuleInit() {
    this.app = App.create(this.repository);

    this.broker.register('createOrderFromCheckoutPlacement', async (params: any) => {
      return this.app.orderUsecase.createOrder.execute(params);
    });

    this.broker.register('generateOrderId', async () => ({ id: uuidv7() }));

    this.broker.register(
      OrderFulfillmentActionNames.listForOrder,
      (params: ListOrderDeliveryFulfillmentOrdersParams): Promise<ListOrderDeliveryFulfillmentOrdersResult> =>
        this.repository.fulfillment.listForOrder(params),
    );

    this.broker.register(
      OrderFulfillmentActionNames.getShipmentPlan,
      (params: GetOrderDeliveryShipmentPlanParams): Promise<GetOrderDeliveryShipmentPlanResult> =>
        this.repository.fulfillment.getShipmentPlan(params),
    );

    this.broker.register(
      OrderFulfillmentActionNames.applyShipmentUpdate,
      (params: ApplyOrderDeliveryShipmentUpdateParams): Promise<ApplyOrderDeliveryShipmentUpdateResult> =>
        this.repository.fulfillment.applyShipmentUpdate(params),
    );

    this.broker.register('getOrderById', async (params: any) => {
      return this.app.orderUsecase.getOrderById.execute(params);
    });

    this.broker.register(
      OrderLoyaltyActionNames.publishEligible,
      async (
        params: PublishOrderLoyaltyRewardEligibleParams,
      ): Promise<PublishOrderLoyaltyRewardEligibleResult> =>
        this.broker.runWorkflow(
          "order.publishLoyaltyRewardEligible",
          params,
          {
            source: "content",
            resourceId: params.orderId,
            operation: `publishLoyaltyRewardEligible:${params.orderRevision}`,
            content: { orderId: params.orderId, orderRevision: params.orderRevision },
            tenantId: params.organizationId,
          },
        ),
    );

    this.broker.register(
      OrderLoyaltyActionNames.publishReversed,
      async (
        params: PublishOrderLoyaltyRewardReversedParams,
      ): Promise<PublishOrderLoyaltyRewardReversedResult> =>
        this.broker.runWorkflow(
          "order.publishLoyaltyRewardReversed",
          params,
          {
            source: "content",
            resourceId: `${params.orderId}:${params.sourceId}`,
            operation: `publishLoyaltyRewardReversed:${params.sourceRevision}`,
            content: params,
            tenantId: params.organizationId,
          },
        ),
    );

    this.broker.register(
      OrderReviewActionNames.verifyPurchase,
      async (params: VerifyReviewPurchaseParams): Promise<VerifyReviewPurchaseResult> => {
        const order = await this.app.orderReadRepository.findById(params.orderId);
        if (!order || order.storeId !== params.storeId || order.deletedAt) {
          return { eligible: false, code: 'ORDER_NOT_FOUND' };
        }
        if (order.status === 'DRAFT' || order.status === 'CANCELLED') {
          return { eligible: false, code: 'ORDER_NOT_ELIGIBLE' };
        }
        if (order.customerId !== params.customerId) {
          return { eligible: false, code: 'ORDER_CUSTOMER_MISMATCH' };
        }
        const line = order.lineItems.find(
          (item) => item.id === params.orderLineId && item.deletedAt === null,
        );
        if (!line) return { eligible: false, code: 'ORDER_LINE_NOT_FOUND' };
        if (params.variantId && line.unit.id !== params.variantId) {
          return { eligible: false, code: 'ORDER_LINE_VARIANT_MISMATCH' };
        }
        const targeting = isRecord(line.unit.snapshot)
          && isRecord(line.unit.snapshot.targeting)
          ? line.unit.snapshot.targeting
          : null;
        if (targeting?.productId !== params.productId) {
          return { eligible: false, code: 'ORDER_LINE_PRODUCT_MISMATCH' };
        }
        return { eligible: true, verificationMethod: 'ORDER_LINE' };
      },
    );

    this.servers = await startServer(this.broker as any);
    this.logger.log('Orders service started');
  }

  async onModuleDestroy() {
    if (this.servers) {
      await Promise.all([
        this.servers.adminApp.close(),
        this.servers.storefrontApp.close(),
      ]);
    }
    this.logger.log('Orders service stopped');
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

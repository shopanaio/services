import { Inject, Injectable, Logger, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { InjectBroker, ServiceBroker } from "@shopana/shared-kernel";
import "reflect-metadata";
import { App } from "./ioc/container";
import { startServer } from "./interfaces/server/server";
import { v7 as uuidv7 } from "uuid";
import { Repository } from "./repositories/Repository.js";
import {
  OrderCheckoutActionNames,
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
  type CancelOrderFromCheckoutPlacementV1Params,
  type ConfirmOrderFromCheckoutPlacementV1Params,
  type CreateOrderFromCheckoutPlacementV1Params,
  type CreateOrderFromCheckoutPlacementV1Result,
  type GetOrderCheckoutPlacementV1Params,
  type OrderCheckoutPlacementV1Result,
} from "@shopana/broker-types";
import type { BrokerCallContext } from "@shopana/shared-kernel";
import {
  cancelOrderFromCheckoutPlacementV1Schema,
  confirmOrderFromCheckoutPlacementV1Schema,
  createOrderFromCheckoutPlacementV1Schema,
  getOrderCheckoutPlacementV1Schema,
} from "./domain/placement/OrderPlacementContracts.js";

@Injectable()
export class OrdersNestService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OrdersNestService.name);
  private app!: App;
  private servers!: Awaited<ReturnType<typeof startServer>>;

  constructor(
    @InjectBroker("order") private readonly broker: ServiceBroker,
    @Inject(Repository)
    private readonly repository: Repository,
  ) {}

  async onModuleInit() {
    this.app = App.create(this.repository);

    this.broker.register(
      OrderCheckoutActionNames.createFromPlacement,
      async (
        params: CreateOrderFromCheckoutPlacementV1Params | undefined,
        context: BrokerCallContext,
      ): Promise<CreateOrderFromCheckoutPlacementV1Result> => {
        assertCheckoutCaller(context);
        const input = createOrderFromCheckoutPlacementV1Schema.parse(requireParams(params));
        return this.broker.runWorkflow("order.createOrderFromCheckoutPlacementV1", input, {
          source: "content",
          organizationId: input.organizationId,
          resourceId: input.placementId,
          operation: "createOrderFromCheckoutPlacementV1",
          content: input,
        });
      },
    );

    this.broker.register(
      OrderCheckoutActionNames.confirmPlacement,
      async (
        params: ConfirmOrderFromCheckoutPlacementV1Params | undefined,
        context: BrokerCallContext,
      ): Promise<OrderCheckoutPlacementV1Result> => {
        assertCheckoutCaller(context);
        const input = confirmOrderFromCheckoutPlacementV1Schema.parse(requireParams(params));
        return this.broker.runWorkflow("order.confirmOrderFromCheckoutPlacementV1", input, {
          source: "content",
          organizationId: input.organizationId,
          resourceId: input.placementId,
          operation: "confirmOrderFromCheckoutPlacementV1",
          content: input,
        });
      },
    );

    this.broker.register(
      OrderCheckoutActionNames.cancelPlacement,
      async (
        params: CancelOrderFromCheckoutPlacementV1Params | undefined,
        context: BrokerCallContext,
      ): Promise<OrderCheckoutPlacementV1Result> => {
        assertCheckoutCaller(context);
        const input = cancelOrderFromCheckoutPlacementV1Schema.parse(requireParams(params));
        return this.broker.runWorkflow("order.cancelOrderFromCheckoutPlacementV1", input, {
          source: "content",
          organizationId: input.organizationId,
          resourceId: input.placementId,
          operation: "cancelOrderFromCheckoutPlacementV1",
          content: input,
        });
      },
    );

    this.broker.register(
      OrderCheckoutActionNames.getPlacement,
      async (
        params: GetOrderCheckoutPlacementV1Params | undefined,
        context: BrokerCallContext,
      ): Promise<OrderCheckoutPlacementV1Result | null> => {
        assertCheckoutCaller(context);
        const input = getOrderCheckoutPlacementV1Schema.parse(requireParams(params));
        return this.repository.checkoutPlacement.get(input);
      },
    );

    this.broker.register("generateOrderId", async () => ({ id: uuidv7() }));

    this.broker.register(
      OrderFulfillmentActionNames.listForOrder,
      (
        params: ListOrderDeliveryFulfillmentOrdersParams | undefined,
        context: BrokerCallContext,
      ): Promise<ListOrderDeliveryFulfillmentOrdersResult> =>
        withDeliveryCaller(context, () =>
          this.repository.fulfillment.listForOrder(requireParams(params)),
        ),
    );

    this.broker.register(
      OrderFulfillmentActionNames.getShipmentPlan,
      (
        params: GetOrderDeliveryShipmentPlanParams | undefined,
        context: BrokerCallContext,
      ): Promise<GetOrderDeliveryShipmentPlanResult> =>
        withDeliveryCaller(context, () =>
          this.repository.fulfillment.getShipmentPlan(requireParams(params)),
        ),
    );

    this.broker.register(
      OrderFulfillmentActionNames.applyShipmentUpdate,
      async (
        params: ApplyOrderDeliveryShipmentUpdateParams | undefined,
        context: BrokerCallContext,
      ): Promise<ApplyOrderDeliveryShipmentUpdateResult> =>
        withDeliveryCaller(context, async () => {
          const input = requireParams(params);
          return this.broker.runWorkflow("order.applyDeliveryShipmentUpdate", input, {
            source: "content",
            resourceId: input.update.fulfillmentOrderId,
            operation: `applyDeliveryShipmentUpdate:${input.update.shipmentRevision}`,
            content: input,
          });
        }),
    );

    this.broker.register(
      OrderLoyaltyActionNames.publishEligible,
      async (
        params: PublishOrderLoyaltyRewardEligibleParams | undefined,
      ): Promise<PublishOrderLoyaltyRewardEligibleResult> => {
        const input = requireParams(params);
        return this.broker.runWorkflow("order.publishLoyaltyRewardEligible", input, {
          source: "content",
          resourceId: input.orderId,
          operation: `publishLoyaltyRewardEligible:${input.orderRevision}`,
          content: { orderId: input.orderId, orderRevision: input.orderRevision },
          organizationId: input.organizationId,
        });
      },
    );

    this.broker.register(
      OrderLoyaltyActionNames.publishReversed,
      async (
        params: PublishOrderLoyaltyRewardReversedParams | undefined,
      ): Promise<PublishOrderLoyaltyRewardReversedResult> => {
        const input = requireParams(params);
        return this.broker.runWorkflow("order.publishLoyaltyRewardReversed", input, {
          source: "content",
          resourceId: `${input.orderId}:${input.sourceId}`,
          operation: `publishLoyaltyRewardReversed:${input.sourceRevision}`,
          content: input,
          organizationId: input.organizationId,
        });
      },
    );

    this.broker.register(
      OrderReviewActionNames.verifyPurchase,
      async (
        params: VerifyReviewPurchaseParams | undefined,
      ): Promise<VerifyReviewPurchaseResult> => {
        params = requireParams(params);
        const order = await this.app.orderReadRepository.findById(params.orderId);
        if (!order || order.storeId !== params.storeId || order.deletedAt) {
          return { eligible: false, code: "ORDER_NOT_FOUND" };
        }
        if (order.status === "DRAFT" || order.status === "CANCELLED") {
          return { eligible: false, code: "ORDER_NOT_ELIGIBLE" };
        }
        if (order.customerId !== params.customerId) {
          return { eligible: false, code: "ORDER_CUSTOMER_MISMATCH" };
        }
        const line = order.lineItems.find(
          (item) => item.id === params.orderLineId && item.deletedAt === null,
        );
        if (!line) return { eligible: false, code: "ORDER_LINE_NOT_FOUND" };
        if (params.variantId && line.unit.id !== params.variantId) {
          return { eligible: false, code: "ORDER_LINE_VARIANT_MISMATCH" };
        }
        const targeting =
          isRecord(line.unit.snapshot) && isRecord(line.unit.snapshot.targeting)
            ? line.unit.snapshot.targeting
            : null;
        if (targeting?.productId !== params.productId) {
          return { eligible: false, code: "ORDER_LINE_PRODUCT_MISMATCH" };
        }
        return { eligible: true, verificationMethod: "ORDER_LINE" };
      },
    );

    this.servers = await startServer(this.broker as any);
    this.logger.log("Orders service started");
  }

  async onModuleDestroy() {
    if (this.servers) {
      await Promise.all([this.servers.adminApp.close(), this.servers.storefrontApp.close()]);
    }
    this.logger.log("Orders service stopped");
  }
}

function requireParams<T>(params: T | undefined): T {
  if (params === undefined) throw new Error("Broker action parameters are required");
  return params;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function assertCheckoutCaller(context: BrokerCallContext): void {
  if (context.caller.kind !== "action" || context.caller.service !== "checkout") {
    throw new Error("ORDER_CHECKOUT_CALLER_FORBIDDEN");
  }
}

function withDeliveryCaller<TResult>(
  context: BrokerCallContext,
  callback: () => Promise<TResult>,
): Promise<TResult> {
  if (context.caller.kind !== "action" || context.caller.service !== "delivery") {
    throw new Error("ORDER_DELIVERY_CALLER_FORBIDDEN");
  }
  return callback();
}

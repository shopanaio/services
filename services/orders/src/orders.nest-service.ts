import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import {
  InjectBroker,
  ServiceBroker,
  type BrokerCallContext,
} from '@shopana/shared-kernel';
import type { Orders } from "@shopana/broker-types";
import { rawSql } from "@event-driven-io/dumbo";
import 'reflect-metadata';
import { App } from './ioc/container';
import { startServer } from './interfaces/server/server';
import { dumboPool } from "./infrastructure/db/dumbo.js";
import { knex } from "./infrastructure/db/knex.js";

@Injectable()
export class OrdersNestService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OrdersNestService.name);
  private app!: App;
  private servers!: Awaited<ReturnType<typeof startServer>>;

  constructor(@InjectBroker('order') private readonly broker: ServiceBroker) {}

  async onModuleInit() {
    this.app = App.create(this.broker as any);

    this.broker.register('createOrder', async (params: any) => {
      return this.app.orderUsecase.createOrder.execute(params);
    });

    this.broker.register('getOrderById', async (params: any) => {
      return this.app.orderUsecase.getOrderById.execute(params);
    });

    this.broker.register<
      Orders.GetStoreOrderSummaryParams,
      Orders.GetStoreOrderSummaryResult
    >("getStoreOrderSummary", async (params, context) => {
      this.assertNotificationsCaller(context);
      const input = params!;
      const query = knex
        .withSchema("platform")
        .from("orders")
        .where("store_id", input.storeId)
        .where("currency_code", input.currencyCode)
        .whereNull("deleted_at")
        .where("created_at", ">=", input.periodStart)
        .where("created_at", "<", input.periodEnd)
        .select(
          knex.raw("count(*)::int as order_count"),
          knex.raw("coalesce(sum(grand_total), 0)::bigint as total_amount")
        )
        .toString();
      const result = await dumboPool.execute.query<{
        order_count: number;
        total_amount: string;
      }>(rawSql(query));
      const row = result.rows[0];
      return {
        storeId: input.storeId,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        orderCount: Number(row?.order_count ?? 0),
        totalAmount: Number(row?.total_amount ?? 0),
        currencyCode: input.currencyCode,
      };
    });

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

  private assertNotificationsCaller(context: BrokerCallContext): void {
    if (
      context.caller.kind !== "action" ||
      context.caller.service !== "notifications"
    ) {
      throw new Error("Order summary caller is not allowed");
    }
  }
}

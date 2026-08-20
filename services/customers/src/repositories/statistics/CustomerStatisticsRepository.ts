import { createQuery, createRelayQuery, type InferRelayInput } from "@shopana/drizzle-query";
import { ReadOnly, Transactional } from "@shopana/shared-kernel";
import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { BaseRepository } from "../BaseRepository.js";
import { normalizeRelayPagination, type RepositoryConnectionResult } from "../connection.js";
import {
  decodeCustomerGlobalId,
  decodeCustomerMonetaryStatisticsGlobalId,
  mapGraphQlBigInt,
} from "../global-id-where-mappers.js";
import {
  customerMonetaryStatistics,
  customer,
  customerOrderProjection,
  customerCheckoutProjection,
  customerRefundProjection,
  customerStatistics,
  type CustomerMonetaryStatistics,
  type CustomerStatistics,
  type NewCustomerMonetaryStatistics,
  type NewCustomerStatistics,
} from "../models/index.js";

export const customerMonetaryStatisticsRelayQuery = createRelayQuery(
  createQuery(customerMonetaryStatistics)
    .include(["id"])
    .mapWhereFields({
      id: decodeCustomerMonetaryStatisticsGlobalId,
      customerId: decodeCustomerGlobalId,
      totalSpentMinor: mapGraphQlBigInt,
      totalRefundedMinor: mapGraphQlBigInt,
      netSpentMinor: mapGraphQlBigInt,
      averageOrderValueMinor: mapGraphQlBigInt,
    })
    .maxLimit(100)
    .defaultLimit(20),
  { name: "customerMonetaryStatistics", tieBreaker: "id" },
);

export type CustomerMonetaryStatisticsRelayInput = InferRelayInput<
  typeof customerMonetaryStatisticsRelayQuery
>;
export type CustomerMonetaryStatisticsConnectionInput = CustomerMonetaryStatisticsRelayInput & {
  customerId: string;
};

export type CustomerStatisticsUpsertData = Omit<NewCustomerStatistics, "storeId" | "updatedAt">;
export type CustomerMonetaryStatisticsUpsertData = Omit<
  NewCustomerMonetaryStatistics,
  "id" | "storeId" | "updatedAt"
>;

export class CustomerStatisticsRepository extends BaseRepository {
  async projectOrder(input: {
    orderId: string;
    customerId: string;
    revision: number;
    status: "OPEN" | "COMPLETED" | "CANCELLED";
    currencyCode: string;
    totalAmountMinor: bigint;
    createdAt: string;
    completedAt?: string | null;
    cancelledAt?: string | null;
    updatedAt: string;
  }): Promise<boolean> {
    const rows = await this.connection
      .insert(customerOrderProjection)
      .values({
        ...input,
        storeId: this.storeId,
        currencyCode: input.currencyCode.toUpperCase(),
        completedAt: input.completedAt ?? null,
        cancelledAt: input.cancelledAt ?? null,
      })
      .onConflictDoUpdate({
        target: customerOrderProjection.orderId,
        set: {
          revision: input.revision,
          status: input.status,
          currencyCode: input.currencyCode.toUpperCase(),
          totalAmountMinor: input.totalAmountMinor,
          createdAt: input.createdAt,
          completedAt: input.completedAt ?? null,
          cancelledAt: input.cancelledAt ?? null,
          updatedAt: input.updatedAt,
        },
        setWhere: sql`${customerOrderProjection.storeId} = ${this.storeId}
          AND ${customerOrderProjection.customerId} = ${input.customerId}
          AND ${customerOrderProjection.revision} < ${input.revision}`,
      })
      .returning({ orderId: customerOrderProjection.orderId });
    return rows.length > 0;
  }

  async projectCheckout(input: {
    checkoutId: string;
    customerId: string;
    version: number;
    occurredAt: string;
  }): Promise<boolean> {
    const rows = await this.connection
      .insert(customerCheckoutProjection)
      .values({ ...input, storeId: this.storeId, updatedAt: input.occurredAt })
      .onConflictDoUpdate({
        target: customerCheckoutProjection.checkoutId,
        set: {
          version: input.version,
          occurredAt: input.occurredAt,
          updatedAt: input.occurredAt,
        },
        setWhere: sql`${customerCheckoutProjection.storeId} = ${this.storeId}
          AND ${customerCheckoutProjection.customerId} = ${input.customerId}
          AND ${customerCheckoutProjection.version} < ${input.version}`,
      })
      .returning({ checkoutId: customerCheckoutProjection.checkoutId });
    return rows.length > 0;
  }

  async projectRefund(input: {
    refundId: string;
    customerId: string;
    orderId: string;
    revision: number;
    currencyCode: string;
    amountMinor: bigint;
    refundedAt: string;
  }): Promise<boolean> {
    const rows = await this.connection
      .insert(customerRefundProjection)
      .values({
        ...input,
        storeId: this.storeId,
        currencyCode: input.currencyCode.toUpperCase(),
        updatedAt: input.refundedAt,
      })
      .onConflictDoUpdate({
        target: customerRefundProjection.refundId,
        set: {
          revision: input.revision,
          amountMinor: input.amountMinor,
          currencyCode: input.currencyCode.toUpperCase(),
          refundedAt: input.refundedAt,
          updatedAt: input.refundedAt,
        },
        setWhere: sql`${customerRefundProjection.storeId} = ${this.storeId}
          AND ${customerRefundProjection.customerId} = ${input.customerId}
          AND ${customerRefundProjection.orderId} = ${input.orderId}
          AND ${customerRefundProjection.revision} < ${input.revision}`,
      })
      .returning({ refundId: customerRefundProjection.refundId });
    return rows.length > 0;
  }

  @Transactional()
  async rebuildForCustomer(customerId: string): Promise<boolean> {
    if (!(await this.repositoryCustomerExists(customerId))) return false;
    const [orders, checkouts, refunds] = await Promise.all([
      this.connection
        .select()
        .from(customerOrderProjection)
        .where(
          and(
            eq(customerOrderProjection.storeId, this.storeId),
            eq(customerOrderProjection.customerId, customerId),
          ),
        )
        .orderBy(asc(customerOrderProjection.createdAt), asc(customerOrderProjection.orderId)),
      this.connection
        .select()
        .from(customerCheckoutProjection)
        .where(
          and(
            eq(customerCheckoutProjection.storeId, this.storeId),
            eq(customerCheckoutProjection.customerId, customerId),
          ),
        ),
      this.connection
        .select()
        .from(customerRefundProjection)
        .where(
          and(
            eq(customerRefundProjection.storeId, this.storeId),
            eq(customerRefundProjection.customerId, customerId),
          ),
        ),
    ]);
    const completedOrders = orders
      .filter(
        (row): row is typeof row & { completedAt: string } =>
          row.status === "COMPLETED" && row.completedAt !== null,
      )
      .sort(
        (left, right) =>
          left.completedAt.localeCompare(right.completedAt) ||
          left.orderId.localeCompare(right.orderId),
      );
    const first = completedOrders[0] ?? null;
    const last = completedOrders[completedOrders.length - 1] ?? null;
    const lastCheckoutAt = checkouts.reduce<string | null>(
      (latest, row) => (!latest || row.occurredAt > latest ? row.occurredAt : latest),
      null,
    );
    await this.upsertStatistics({
      customerId,
      ordersCount: orders.length,
      completedOrdersCount: completedOrders.length,
      cancelledOrdersCount: orders.filter((row) => row.status === "CANCELLED").length,
      returnsCount: new Set(refunds.map((row) => row.orderId)).size,
      firstOrderId: first?.orderId ?? null,
      firstOrderAt: first?.completedAt ?? null,
      lastOrderId: last?.orderId ?? null,
      lastOrderAt: last?.completedAt ?? null,
      lastCheckoutAt,
    });

    const monetary = new Map<string, { ordersCount: number; spent: bigint; refunded: bigint }>();
    for (const order of orders) {
      if (order.status !== "COMPLETED") continue;
      const entry = monetary.get(order.currencyCode) ?? {
        ordersCount: 0,
        spent: 0n,
        refunded: 0n,
      };
      entry.ordersCount += 1;
      entry.spent += order.totalAmountMinor;
      monetary.set(order.currencyCode, entry);
    }
    for (const refund of refunds) {
      const entry = monetary.get(refund.currencyCode) ?? {
        ordersCount: 0,
        spent: 0n,
        refunded: 0n,
      };
      entry.refunded += refund.amountMinor;
      monetary.set(refund.currencyCode, entry);
    }
    await this.replaceMonetaryForCustomer(
      customerId,
      [...monetary.entries()].map(([currencyCode, value]) => ({
        currencyCode,
        ordersCount: value.ordersCount,
        totalSpentMinor: value.spent,
        totalRefundedMinor: value.refunded,
        netSpentMinor: value.spent - value.refunded,
        averageOrderValueMinor:
          value.ordersCount > 0 ? value.spent / BigInt(value.ordersCount) : 0n,
      })),
    );
    return true;
  }

  @ReadOnly()
  async projectedCustomerIds(): Promise<string[]> {
    const rows = await this.connection
      .select({ customerId: customer.id })
      .from(customer)
      .where(and(eq(customer.storeId, this.storeId), isNull(customer.deletedAt)));
    return rows.map((row) => row.customerId);
  }

  private async repositoryCustomerExists(customerId: string): Promise<boolean> {
    const rows = await this.connection
      .select({ id: customer.id })
      .from(customer)
      .where(and(eq(customer.storeId, this.storeId), eq(customer.id, customerId)))
      .limit(1);
    return rows.length > 0;
  }
  @ReadOnly()
  async findByCustomerId(customerId: string): Promise<CustomerStatistics | null> {
    const rows = await this.connection
      .select()
      .from(customerStatistics)
      .where(
        and(
          eq(customerStatistics.storeId, this.storeId),
          eq(customerStatistics.customerId, customerId),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  @ReadOnly()
  async getByCustomerIds(customerIds: readonly string[]): Promise<CustomerStatistics[]> {
    if (customerIds.length === 0) return [];
    return this.connection
      .select()
      .from(customerStatistics)
      .where(
        and(
          eq(customerStatistics.storeId, this.storeId),
          inArray(customerStatistics.customerId, [...new Set(customerIds)]),
        ),
      );
  }

  @ReadOnly()
  async findMonetaryById(id: string): Promise<CustomerMonetaryStatistics | null> {
    const rows = await this.connection
      .select()
      .from(customerMonetaryStatistics)
      .where(
        and(
          eq(customerMonetaryStatistics.storeId, this.storeId),
          eq(customerMonetaryStatistics.id, id),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  @ReadOnly()
  async getMonetaryByIds(ids: readonly string[]): Promise<CustomerMonetaryStatistics[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(customerMonetaryStatistics)
      .where(
        and(
          eq(customerMonetaryStatistics.storeId, this.storeId),
          inArray(customerMonetaryStatistics.id, [...new Set(ids)]),
        ),
      );
  }

  async upsertStatistics(data: CustomerStatisticsUpsertData): Promise<CustomerStatistics> {
    const updatedAt = new Date().toISOString();
    const current = await this.findByCustomerId(data.customerId);
    const rows = current
      ? await this.connection
          .update(customerStatistics)
          .set({ ...data, updatedAt })
          .where(
            and(
              eq(customerStatistics.storeId, this.storeId),
              eq(customerStatistics.customerId, data.customerId),
            ),
          )
          .returning()
      : await this.connection
          .insert(customerStatistics)
          .values({ ...data, storeId: this.storeId, updatedAt })
          .returning();
    return rows[0];
  }

  async upsertMonetary(
    data: CustomerMonetaryStatisticsUpsertData,
  ): Promise<CustomerMonetaryStatistics> {
    const updatedAt = new Date().toISOString();
    const row: NewCustomerMonetaryStatistics = {
      ...data,
      id: await this.generateUuidV7(),
      storeId: this.storeId,
      currencyCode: data.currencyCode.toUpperCase(),
      updatedAt,
    };
    const current = await this.findMonetaryByCustomerAndCurrency(data.customerId, row.currencyCode);
    const rows = current
      ? await this.connection
          .update(customerMonetaryStatistics)
          .set({
            ordersCount: row.ordersCount,
            totalSpentMinor: row.totalSpentMinor,
            totalRefundedMinor: row.totalRefundedMinor,
            netSpentMinor: row.netSpentMinor,
            averageOrderValueMinor: row.averageOrderValueMinor,
            updatedAt,
          })
          .where(
            and(
              eq(customerMonetaryStatistics.storeId, this.storeId),
              eq(customerMonetaryStatistics.id, current.id),
            ),
          )
          .returning()
      : await this.connection.insert(customerMonetaryStatistics).values(row).returning();
    return rows[0];
  }

  @Transactional()
  async replaceMonetaryForCustomer(
    customerId: string,
    rows: readonly Omit<CustomerMonetaryStatisticsUpsertData, "customerId">[],
  ): Promise<CustomerMonetaryStatistics[]> {
    await this.connection
      .delete(customerMonetaryStatistics)
      .where(
        and(
          eq(customerMonetaryStatistics.storeId, this.storeId),
          eq(customerMonetaryStatistics.customerId, customerId),
        ),
      );
    const result: CustomerMonetaryStatistics[] = [];
    for (const row of rows) {
      result.push(await this.upsertMonetary({ ...row, customerId }));
    }
    return result;
  }

  async deleteForCustomer(customerId: string): Promise<{
    statistics: number;
    monetaryStatistics: number;
    orderProjections: number;
    checkoutProjections: number;
    refundProjections: number;
  }> {
    const statistics = await this.connection
      .delete(customerStatistics)
      .where(
        and(
          eq(customerStatistics.storeId, this.storeId),
          eq(customerStatistics.customerId, customerId),
        ),
      )
      .returning({ id: customerStatistics.customerId });
    const monetary = await this.connection
      .delete(customerMonetaryStatistics)
      .where(
        and(
          eq(customerMonetaryStatistics.storeId, this.storeId),
          eq(customerMonetaryStatistics.customerId, customerId),
        ),
      )
      .returning({ id: customerMonetaryStatistics.id });
    const orders = await this.connection
      .delete(customerOrderProjection)
      .where(
        and(
          eq(customerOrderProjection.storeId, this.storeId),
          eq(customerOrderProjection.customerId, customerId),
        ),
      )
      .returning({ id: customerOrderProjection.orderId });
    const checkouts = await this.connection
      .delete(customerCheckoutProjection)
      .where(
        and(
          eq(customerCheckoutProjection.storeId, this.storeId),
          eq(customerCheckoutProjection.customerId, customerId),
        ),
      )
      .returning({ id: customerCheckoutProjection.checkoutId });
    const refunds = await this.connection
      .delete(customerRefundProjection)
      .where(
        and(
          eq(customerRefundProjection.storeId, this.storeId),
          eq(customerRefundProjection.customerId, customerId),
        ),
      )
      .returning({ id: customerRefundProjection.refundId });
    return {
      statistics: statistics.length,
      monetaryStatistics: monetary.length,
      orderProjections: orders.length,
      checkoutProjections: checkouts.length,
      refundProjections: refunds.length,
    };
  }

  @ReadOnly()
  async getMonetaryConnection(
    input: CustomerMonetaryStatisticsConnectionInput,
  ): Promise<RepositoryConnectionResult> {
    const normalized = normalizeRelayPagination(input);
    const { customerId, where, orderBy, ...pagination } = normalized;
    const mergedWhere: CustomerMonetaryStatisticsRelayInput["where"] = {
      _and: [
        { storeId: { _eq: this.storeId } },
        { customerId: { _eq: customerId } },
        ...(where ? [where] : []),
      ],
    };
    const effectiveOrder = orderBy ?? [{ field: "currencyCode", direction: "asc" }];
    const query: CustomerMonetaryStatisticsRelayInput = {
      ...pagination,
      where: mergedWhere,
      orderBy: effectiveOrder,
      filters: {
        storeId: this.storeId,
        customerId,
        where: where ?? null,
        orderBy: effectiveOrder,
      },
    };
    const [result, totalCount] = await Promise.all([
      customerMonetaryStatisticsRelayQuery.execute(this.connection, query),
      customerMonetaryStatisticsRelayQuery.count(this.connection, {
        where: mergedWhere,
      }),
    ]);
    return {
      edges: result.edges.map(({ cursor, node }) => ({ cursor, nodeId: node.id })),
      pageInfo: result.pageInfo,
      totalCount,
    };
  }

  private async findMonetaryByCustomerAndCurrency(
    customerId: string,
    currencyCode: string,
  ): Promise<CustomerMonetaryStatistics | null> {
    const rows = await this.connection
      .select()
      .from(customerMonetaryStatistics)
      .where(
        and(
          eq(customerMonetaryStatistics.storeId, this.storeId),
          eq(customerMonetaryStatistics.customerId, customerId),
          eq(customerMonetaryStatistics.currencyCode, currencyCode),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }
}

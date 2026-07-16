import {
  createQuery,
  createRelayQuery,
  type InferRelayInput,
} from "@shopana/drizzle-query";
import { ReadOnly, Transactional } from "@shopana/shared-kernel";
import { and, eq, inArray } from "drizzle-orm";
import { BaseRepository } from "../BaseRepository.js";
import {
  normalizeRelayPagination,
  type RepositoryConnectionResult,
} from "../connection.js";
import {
  decodeCustomerGlobalId,
  decodeCustomerMonetaryStatisticsGlobalId,
  mapGraphQlBigInt,
} from "../global-id-where-mappers.js";
import {
  customerMonetaryStatistics,
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
  { name: "customerMonetaryStatistics", tieBreaker: "id" }
);

export type CustomerMonetaryStatisticsRelayInput = InferRelayInput<
  typeof customerMonetaryStatisticsRelayQuery
>;
export type CustomerMonetaryStatisticsConnectionInput =
  CustomerMonetaryStatisticsRelayInput & { customerId: string };

export type CustomerStatisticsUpsertData = Omit<
  NewCustomerStatistics,
  "storeId" | "updatedAt"
>;
export type CustomerMonetaryStatisticsUpsertData = Omit<
  NewCustomerMonetaryStatistics,
  "id" | "storeId" | "updatedAt"
>;

export class CustomerStatisticsRepository extends BaseRepository {
  @ReadOnly()
  async findByCustomerId(customerId: string): Promise<CustomerStatistics | null> {
    const rows = await this.connection
      .select()
      .from(customerStatistics)
      .where(
        and(
          eq(customerStatistics.storeId, this.storeId),
          eq(customerStatistics.customerId, customerId)
        )
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
          inArray(customerStatistics.customerId, [...new Set(customerIds)])
        )
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
          eq(customerMonetaryStatistics.id, id)
        )
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
          inArray(customerMonetaryStatistics.id, [...new Set(ids)])
        )
      );
  }

  async upsertStatistics(
    data: CustomerStatisticsUpsertData
  ): Promise<CustomerStatistics> {
    const updatedAt = new Date().toISOString();
    const current = await this.findByCustomerId(data.customerId);
    const rows = current
      ? await this.connection
        .update(customerStatistics)
        .set({ ...data, updatedAt })
        .where(
          and(
            eq(customerStatistics.storeId, this.storeId),
            eq(customerStatistics.customerId, data.customerId)
          )
        )
        .returning()
      : await this.connection
        .insert(customerStatistics)
        .values({ ...data, storeId: this.storeId, updatedAt })
        .returning();
    return rows[0];
  }

  async upsertMonetary(
    data: CustomerMonetaryStatisticsUpsertData
  ): Promise<CustomerMonetaryStatistics> {
    const updatedAt = new Date().toISOString();
    const row: NewCustomerMonetaryStatistics = {
      ...data,
      id: await this.generateUuidV7(),
      storeId: this.storeId,
      currencyCode: data.currencyCode.toUpperCase(),
      updatedAt,
    };
    const current = await this.findMonetaryByCustomerAndCurrency(
      data.customerId,
      row.currencyCode
    );
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
            eq(customerMonetaryStatistics.id, current.id)
          )
        )
        .returning()
      : await this.connection
        .insert(customerMonetaryStatistics)
        .values(row)
        .returning();
    return rows[0];
  }

  @Transactional()
  async replaceMonetaryForCustomer(
    customerId: string,
    rows: readonly Omit<CustomerMonetaryStatisticsUpsertData, "customerId">[]
  ): Promise<CustomerMonetaryStatistics[]> {
    await this.connection
      .delete(customerMonetaryStatistics)
      .where(
        and(
          eq(customerMonetaryStatistics.storeId, this.storeId),
          eq(customerMonetaryStatistics.customerId, customerId)
        )
      );
    const result: CustomerMonetaryStatistics[] = [];
    for (const row of rows) {
      result.push(await this.upsertMonetary({ ...row, customerId }));
    }
    return result;
  }

  @ReadOnly()
  async getMonetaryConnection(
    input: CustomerMonetaryStatisticsConnectionInput
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
    currencyCode: string
  ): Promise<CustomerMonetaryStatistics | null> {
    const rows = await this.connection
      .select()
      .from(customerMonetaryStatistics)
      .where(
        and(
          eq(customerMonetaryStatistics.storeId, this.storeId),
          eq(customerMonetaryStatistics.customerId, customerId),
          eq(customerMonetaryStatistics.currencyCode, currencyCode)
        )
      )
      .limit(1);
    return rows[0] ?? null;
  }
}

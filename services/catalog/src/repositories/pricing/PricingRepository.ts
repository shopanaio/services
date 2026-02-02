import { and, eq, gte, isNull, lte, or, sql } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import {
  createQuery,
  createCursorQuery,
  createRelayQuery,
  type InferExecuteOptions,
  type InferCursorInput,
  type InferRelayInput,
  type PageInfo,
} from "@shopana/drizzle-query";
import { Transactional, ReadOnly } from "@shopana/shared-kernel";
import { BaseRepository } from "../BaseRepository.js";
import {
  itemPricing,
  variantPricesCurrent,
  type ItemPricing,
  type NewItemPricing,
} from "../models/index.js";

type Currency = "UAH" | "USD" | "EUR";

const pricingQuery = createQuery(itemPricing).maxLimit(100).defaultLimit(20);

const pricingPaginationQuery = createCursorQuery(
  createQuery(itemPricing).maxLimit(100).defaultLimit(20).include(["id"]),
  { tieBreaker: "id" }
);

const pricingRelayQuery = createRelayQuery(
  createQuery(itemPricing)
    .include(["id", "variantId", "currency", "effectiveFrom", "effectiveTo"])
    .maxLimit(100)
    .defaultLimit(20),
  { name: "itemPricing", tieBreaker: "id" }
);

export type PricingQueryInput = InferExecuteOptions<typeof pricingQuery>;
export type PricingCursorInput = InferCursorInput<typeof pricingPaginationQuery>;
export type PricingRelayInput = InferRelayInput<typeof pricingRelayQuery>;

export interface PriceHistoryStatistics {
  minPriceMinor: number;
  maxPriceMinor: number;
  avgPriceMinor: number;
  currency: Currency;
}

export interface GetCurrentPriceInput {
  variantId: string;
  currency: Currency;
}

export interface GetPriceHistoryInput {
  variantId: string;
  currency: Currency;
  from: Date;
  to: Date;
  first?: number;
  after?: string;
}

export interface PriceHistoryConnectionResult {
  edges: Array<{ cursor: string; node: ItemPricing }>;
  pageInfo: PageInfo;
  totalCount?: number;
}

export interface GetPriceStatisticsInput {
  variantId: string;
  currency: Currency;
  from: Date;
  to: Date;
}

export class PricingRepository extends BaseRepository {
  private buildOverlapWhere(from: Date, to: Date) {
    return {
      effectiveFrom: { _lte: to.toISOString() },
      _or: [
        { effectiveTo: { _is: null } },
        { effectiveTo: { _gte: from.toISOString() } },
      ],
    };
  }

  // ============ CRUD ============

  @Transactional()
  async closeCurrent(variantId: string, currency: Currency): Promise<void> {
    await this.connection
      .update(itemPricing)
      .set({ effectiveTo: new Date().toISOString() })
      .where(
        and(
          eq(itemPricing.projectId, this.storeId),
          eq(itemPricing.variantId, variantId),
          eq(itemPricing.currency, currency),
          isNull(itemPricing.effectiveTo)
        )
      );
  }

  @Transactional()
  async create(
    variantId: string,
    data: {
      currency: Currency;
      amountMinor: number;
      compareAtMinor?: number | null;
    }
  ): Promise<ItemPricing> {
    const id = uuidv7();
    const now = new Date().toISOString();

    const newPricing: NewItemPricing = {
      projectId: this.storeId,
      id,
      variantId,
      currency: data.currency,
      amountMinor: data.amountMinor,
      compareAtMinor: data.compareAtMinor ?? null,
      effectiveFrom: now,
      effectiveTo: null,
      recordedAt: now,
    };

    const result = await this.connection
      .insert(itemPricing)
      .values(newPricing)
      .returning();

    return result[0];
  }

  @Transactional()
  async setPrice(
    variantId: string,
    data: {
      currency: Currency;
      amountMinor: number;
      compareAtMinor?: number | null;
    }
  ): Promise<ItemPricing> {
    const now = new Date().toISOString();
    await this.connection
      .update(itemPricing)
      .set({ effectiveTo: now })
      .where(
        and(
          eq(itemPricing.projectId, this.storeId),
          eq(itemPricing.variantId, variantId),
          eq(itemPricing.currency, data.currency),
          isNull(itemPricing.effectiveTo)
        )
      );

    const id = uuidv7();
    const result = await this.connection
      .insert(itemPricing)
      .values({
        projectId: this.storeId,
        id,
        variantId,
        currency: data.currency,
        amountMinor: data.amountMinor,
        compareAtMinor: data.compareAtMinor ?? null,
        effectiveFrom: now,
        effectiveTo: null,
        recordedAt: now,
      })
      .returning();

    return result[0]!;
  }

  // ============ Query ============

  @ReadOnly()
  async getMany(input?: PricingQueryInput): Promise<ItemPricing[]> {
    return pricingQuery.execute(this.connection, {
      ...input,
      where: {
        ...input?.where,
        projectId: { _eq: this.storeId },
      },
    });
  }

  @ReadOnly()
  async getOne(id: string): Promise<ItemPricing | null> {
    const results = await pricingQuery.execute(this.connection, {
      where: {
        id: { _eq: id },
        projectId: { _eq: this.storeId },
      },
      limit: 1,
    });

    return results[0] ?? null;
  }

  @ReadOnly()
  async getByVariantId(
    variantId: string,
    input?: Omit<PricingQueryInput, "where">
  ): Promise<ItemPricing[]> {
    return pricingQuery.execute(this.connection, {
      ...input,
      where: {
        variantId: { _eq: variantId },
        projectId: { _eq: this.storeId },
      },
    });
  }

  @ReadOnly()
  async getIdsByVariantId(variantId: string, args: PricingCursorInput): Promise<string[]> {
    const result = await pricingPaginationQuery.execute(this.connection, {
      ...args,
      where: {
        ...args.where,
        projectId: { _eq: this.storeId },
        variantId: { _eq: variantId },
      },
    });

    return result.items.map((item) => item.id);
  }

  @ReadOnly()
  async getCurrentPrice(input: GetCurrentPriceInput): Promise<ItemPricing | null> {
    const result = await this.connection
      .select()
      .from(variantPricesCurrent)
      .where(
        and(
          eq(variantPricesCurrent.projectId, this.storeId),
          eq(variantPricesCurrent.variantId, input.variantId),
          eq(variantPricesCurrent.currency, input.currency)
        )
      )
      .limit(1);

    return result[0] ?? null;
  }

  @ReadOnly()
  async getPriceHistory(input: GetPriceHistoryInput): Promise<PriceHistoryConnectionResult> {
    return pricingRelayQuery.execute(this.connection, {
      first: input.first,
      after: input.after,
      where: {
        projectId: { _eq: this.storeId },
        variantId: { _eq: input.variantId },
        currency: { _eq: input.currency },
        ...this.buildOverlapWhere(input.from, input.to),
      },
      orderBy: [{ field: "effectiveFrom", direction: "desc" }],
    });
  }

  @ReadOnly()
  async getPriceStatistics(
    input: GetPriceStatisticsInput
  ): Promise<PriceHistoryStatistics | null> {
    const fromIso = input.from.toISOString();
    const toIso = input.to.toISOString();

    const result = await this.connection
      .select({
        minPriceMinor: sql<number>`MIN(${itemPricing.amountMinor})`,
        maxPriceMinor: sql<number>`MAX(${itemPricing.amountMinor})`,
        avgPriceMinor: sql<number>`ROUND(AVG(${itemPricing.amountMinor}))::bigint`,
      })
      .from(itemPricing)
      .where(
        and(
          eq(itemPricing.projectId, this.storeId),
          eq(itemPricing.variantId, input.variantId),
          eq(itemPricing.currency, input.currency),
          lte(itemPricing.effectiveFrom, toIso),
          or(isNull(itemPricing.effectiveTo), gte(itemPricing.effectiveTo, fromIso))
        )
      );

    if (!result[0] || result[0].minPriceMinor === null) {
      return null;
    }

    return {
      minPriceMinor: Number(result[0].minPriceMinor),
      maxPriceMinor: Number(result[0].maxPriceMinor),
      avgPriceMinor: Number(result[0].avgPriceMinor),
      currency: input.currency,
    };
  }
}

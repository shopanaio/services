import { and, desc, eq, gte, isNull, lt, lte, or, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import {
  createQuery,
  createCursorQuery,
  type InferExecuteOptions,
  type InferCursorInput,
} from "@shopana/drizzle-query";
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

export type PricingQueryInput = InferExecuteOptions<typeof pricingQuery>;
export type PricingCursorInput = InferCursorInput<typeof pricingPaginationQuery>;

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
  limit: number;
  after?: string;
}

export interface GetPriceStatisticsInput {
  variantId: string;
  currency: Currency;
  from: Date;
  to: Date;
}

export class PricingRepository extends BaseRepository {
  private decodeCursor(cursor?: string | null): string | null {
    if (!cursor) return null;
    const decoded = Buffer.from(cursor, "base64").toString("utf8").trim();
    return decoded.length > 0 ? decoded : null;
  }

  // ============ CRUD ============

  async closeCurrent(variantId: string, currency: Currency): Promise<void> {
    await this.connection
      .update(itemPricing)
      .set({ effectiveTo: new Date() })
      .where(
        and(
          eq(itemPricing.projectId, this.storeId),
          eq(itemPricing.variantId, variantId),
          eq(itemPricing.currency, currency),
          isNull(itemPricing.effectiveTo)
        )
      );
  }

  async create(
    variantId: string,
    data: {
      currency: Currency;
      amountMinor: number;
      compareAtMinor?: number | null;
    }
  ): Promise<ItemPricing> {
    const id = randomUUID();
    const now = new Date();

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

  async setPrice(
    variantId: string,
    data: {
      currency: Currency;
      amountMinor: number;
      compareAtMinor?: number | null;
    }
  ): Promise<ItemPricing> {
    await this.closeCurrent(variantId, data.currency);
    return this.create(variantId, data);
  }

  // ============ Query ============

  async getMany(input?: PricingQueryInput): Promise<ItemPricing[]> {
    return pricingQuery.execute(this.connection, {
      ...input,
      where: {
        ...input?.where,
        projectId: { _eq: this.storeId },
      },
    });
  }

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

  async getPriceHistory(input: GetPriceHistoryInput): Promise<ItemPricing[]> {
    const cursorId = this.decodeCursor(input.after);
    let cursorEffectiveFrom: Date | null = null;

    if (cursorId) {
      const cursorResult = await this.connection
        .select({ effectiveFrom: itemPricing.effectiveFrom })
        .from(itemPricing)
        .where(
          and(
            eq(itemPricing.projectId, this.storeId),
            eq(itemPricing.variantId, input.variantId),
            eq(itemPricing.currency, input.currency),
            eq(itemPricing.id, cursorId)
          )
        )
        .limit(1);

      cursorEffectiveFrom = cursorResult[0]?.effectiveFrom ?? null;
    }

    const overlapCondition = and(
      lte(itemPricing.effectiveFrom, input.to),
      or(isNull(itemPricing.effectiveTo), gte(itemPricing.effectiveTo, input.from))
    );

    const cursorCondition =
      cursorId && cursorEffectiveFrom
        ? or(
            lt(itemPricing.effectiveFrom, cursorEffectiveFrom),
            and(
              eq(itemPricing.effectiveFrom, cursorEffectiveFrom),
              lt(itemPricing.id, cursorId)
            )
          )
        : null;

    return this.connection
      .select()
      .from(itemPricing)
      .where(
        and(
          eq(itemPricing.projectId, this.storeId),
          eq(itemPricing.variantId, input.variantId),
          eq(itemPricing.currency, input.currency),
          overlapCondition,
          ...(cursorCondition ? [cursorCondition] : [])
        )
      )
      .orderBy(desc(itemPricing.effectiveFrom), desc(itemPricing.id))
      .limit(input.limit);
  }

  async getPriceStatistics(
    input: GetPriceStatisticsInput
  ): Promise<PriceHistoryStatistics | null> {
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
          lte(itemPricing.effectiveFrom, input.to),
          or(isNull(itemPricing.effectiveTo), gte(itemPricing.effectiveTo, input.from))
        )
      );

    if (!result[0] || result[0].minPriceMinor === null) {
      return null;
    }

    return {
      ...result[0],
      currency: input.currency,
    };
  }
}

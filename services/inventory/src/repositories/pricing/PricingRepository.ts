import { and, eq, isNull } from "drizzle-orm";
import { randomUUID } from "crypto";
import {
  createQuery,
  createCursorQuery,
  type InferExecuteOptions,
  type InferCursorInput,
} from "@shopana/drizzle-query";
import { BaseRepository } from "../BaseRepository.js";
import { itemPricing, type ItemPricing, type NewItemPricing } from "../models/index.js";

type Currency = "UAH" | "USD" | "EUR";

const pricingQuery = createQuery(itemPricing).maxLimit(100).defaultLimit(20);

const pricingPaginationQuery = createCursorQuery(
  createQuery(itemPricing).maxLimit(100).defaultLimit(20).include(["id"]),
  { tieBreaker: "id" }
);

export type PricingQueryInput = InferExecuteOptions<typeof pricingQuery>;
export type PricingCursorInput = InferCursorInput<typeof pricingPaginationQuery>;

export class PricingRepository extends BaseRepository {
  // ============ CRUD ============

  async closeCurrent(variantId: string, currency: Currency): Promise<void> {
    await this.connection
      .update(itemPricing)
      .set({ effectiveTo: new Date() })
      .where(
        and(
          eq(itemPricing.projectId, this.projectId),
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
      projectId: this.projectId,
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
        projectId: { _eq: this.projectId },
      },
    });
  }

  async getOne(id: string): Promise<ItemPricing | null> {
    const results = await pricingQuery.execute(this.connection, {
      where: {
        id: { _eq: id },
        projectId: { _eq: this.projectId },
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
        projectId: { _eq: this.projectId },
      },
    });
  }

  async getIdsByVariantId(variantId: string, args: PricingCursorInput): Promise<string[]> {
    const result = await pricingPaginationQuery.execute(this.connection, {
      ...args,
      where: {
        ...args.where,
        projectId: { _eq: this.projectId },
        variantId: { _eq: variantId },
      },
    });

    return result.items.map((item) => item.id);
  }
}

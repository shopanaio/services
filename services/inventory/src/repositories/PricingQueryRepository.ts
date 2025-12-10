import { createQuery, createCursorQuery } from "@shopana/drizzle-query";
import { BaseRepository } from "./BaseRepository.js";
import { itemPricing, type ItemPricing } from "./models/index.js";
import type { PaginationArgs } from "../views/admin/args.js";

const pricingQuery = createQuery(itemPricing).maxLimit(100).defaultLimit(20);

const pricingPaginationQuery = createCursorQuery(
  createQuery(itemPricing).maxLimit(100).defaultLimit(20).include(["id"]),
  { tieBreaker: "id" }
);

export class PricingQueryRepository extends BaseRepository {
  async getMany(input?: {
    where?: Record<string, unknown>;
    order?: string[];
    limit?: number;
    offset?: number;
  }): Promise<ItemPricing[]> {
    return pricingQuery.execute(this.connection, {
      ...input,
      order: input?.order as never,
      where: {
        ...input?.where,
        projectId: this.projectId,
      },
    });
  }

  async getOne(id: string): Promise<ItemPricing | null> {
    const results = await pricingQuery.execute(this.connection, {
      where: {
        id,
        projectId: this.projectId,
      },
      limit: 1,
    });

    return results[0] ?? null;
  }

  async getByVariantId(
    variantId: string,
    input?: { order?: string[]; limit?: number; offset?: number }
  ): Promise<ItemPricing[]> {
    return pricingQuery.execute(this.connection, {
      ...input,
      order: input?.order as never,
      where: {
        variantId,
        projectId: this.projectId,
      },
    });
  }

  /**
   * Get price IDs by variant ID with cursor pagination
   */
  async getIdsByVariantId(variantId: string, args: PaginationArgs): Promise<string[]> {
    const result = await pricingPaginationQuery.execute(this.connection, {
      ...(args?.last
        ? {
            cursor: args.before,
            direction: "backward",
            limit: args.last ?? 20,
          }
        : {
            cursor: args.after,
            direction: "forward",
            limit: args.first ?? 20,
          }),
      where: {
        projectId: this.projectId,
        variantId,
      },
    });

    return result.items.map((item: { id: string }) => item.id);
  }
}

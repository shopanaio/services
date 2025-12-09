import { createQuery, createCursorQuery } from "@shopana/drizzle-query";
import type { TransactionManager } from "@shopana/shared-kernel";
import type { Database } from "../../infrastructure/db/database.js";
import { getContext } from "../../context/index.js";
import { variant, itemPricing } from "../models/index.js";
import type { PaginationArgs } from "../../views/admin/args.js";
import type { ProductQueries } from "../../views/admin/context.js";

// Create cursor pagination queries with drizzle-query
const variantPaginationQuery = createCursorQuery(
  createQuery(variant).maxLimit(100).defaultLimit(20).include(["id"]),
  { tieBreaker: "id" }
);

const pricePaginationQuery = createCursorQuery(
  createQuery(itemPricing).maxLimit(100).defaultLimit(20).include(["id"]),
  { tieBreaker: "id" }
);

/**
 * Factory for creating paginated query functions.
 * Uses @shopana/drizzle-query createCursorQuery for cursor-based pagination.
 */
export class ProductQueryFactory {
  constructor(
    _db: Database,
    private readonly txManager: TransactionManager<Database>
  ) {}

  private get connection(): Database {
    return this.txManager.getConnection() as Database;
  }

  private get projectId(): string {
    return getContext().project.id;
  }

  /**
   * Create all paginated query functions
   */
  createQueries(): ProductQueries {
    return {
      variantIds: this.createVariantIdsQuery(),
      variantPriceIds: this.createVariantPriceIdsQuery(),
    };
  }

  /**
   * Variant IDs by product ID with cursor pagination
   */
  private createVariantIdsQuery(): ProductQueries["variantIds"] {
    return async (productId: string, args: PaginationArgs) => {
      const result = await variantPaginationQuery.execute(this.connection, {
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
          productId,
          deletedAt: { $is: null },
        },
      });

      return result.items.map((item: { id: string }) => item.id);
    };
  }

  /**
   * Price IDs by variant ID with cursor pagination
   */
  private createVariantPriceIdsQuery(): ProductQueries["variantPriceIds"] {
    return async (variantId: string, args: PaginationArgs) => {
      const result = await pricePaginationQuery.execute(this.connection, {
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
    };
  }
}

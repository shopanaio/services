import { Executor, runWithContext } from "@shopana/type-executor";
import { and, eq, isNull } from "drizzle-orm";
import type { TransactionManager } from "@shopana/shared-kernel";
import type { Database } from "../infrastructure/db/database.js";
import { getContext } from "../context/index.js";
import { product, variant } from "./models/index.js";
import { ProductLoaderFactory } from "./loaders/index.js";
import { ProductQueryFactory } from "./queries/index.js";
import {
  ProductType,
  VariantType,
  type ProductTypeContext,
} from "./types/index.js";

/**
 * ProductTypeRepository - Uses type-executor pattern to resolve products with all relations
 * All types accept only IDs and load data via DataLoaders
 */
export class ProductTypeRepository {
  private readonly executor = new Executor({ onError: "throw" });
  private readonly loaderFactory: ProductLoaderFactory;
  private readonly queryFactory: ProductQueryFactory;

  constructor(
    db: Database,
    private readonly txManager: TransactionManager<Database>
  ) {
    this.loaderFactory = new ProductLoaderFactory(db, txManager);
    this.queryFactory = new ProductQueryFactory(db, txManager);
  }

  /**
   * Get active connection (transaction if in tx, otherwise db)
   */
  private get connection(): Database {
    return this.txManager.getConnection() as Database;
  }

  /**
   * Get projectId from context
   */
  private get projectId(): string {
    return getContext().project.id;
  }

  /**
   * Get locale from context
   */
  private get locale(): string {
    return getContext().locale ?? "uk";
  }

  /**
   * Create context for type resolution
   */
  private createContext(currency?: string): ProductTypeContext {
    return {
      loaders: this.loaderFactory.createLoaders(),
      queries: this.queryFactory.createQueries(),
      locale: this.locale,
      currency,
    };
  }

  /**
   * Resolve a single product by ID
   */
  async resolveById(
    id: string,
    options?: { currency?: string }
  ): Promise<Record<string, unknown> | null> {
    // Check if product exists
    const result = await this.connection
      .select({ id: product.id })
      .from(product)
      .where(
        and(
          eq(product.projectId, this.projectId),
          eq(product.id, id),
          isNull(product.deletedAt)
        )
      )
      .limit(1);

    if (!result[0]) return null;

    const context = this.createContext(options?.currency);
    return runWithContext(context, () =>
      this.executor.resolve(ProductType, id)
    );
  }

  /**
   * Resolve multiple products by IDs
   */
  async resolveMany(
    productIds: string[],
    options?: { currency?: string }
  ): Promise<Record<string, unknown>[]> {
    const context = this.createContext(options?.currency);
    return runWithContext(context, () =>
      this.executor.resolveMany(ProductType, productIds)
    );
  }

  /**
   * Resolve a single variant by ID
   */
  async resolveVariantById(
    id: string,
    options?: { currency?: string }
  ): Promise<Record<string, unknown> | null> {
    // Check if variant exists
    const result = await this.connection
      .select({ id: variant.id })
      .from(variant)
      .where(
        and(
          eq(variant.projectId, this.projectId),
          eq(variant.id, id),
          isNull(variant.deletedAt)
        )
      )
      .limit(1);

    if (!result[0]) return null;

    const context = this.createContext(options?.currency);
    return runWithContext(context, () =>
      this.executor.resolve(VariantType, id)
    );
  }

  /**
   * Resolve multiple variants by IDs
   */
  async resolveVariants(
    variantIds: string[],
    options?: { currency?: string }
  ): Promise<Record<string, unknown>[]> {
    const context = this.createContext(options?.currency);
    return runWithContext(context, () =>
      this.executor.resolveMany(VariantType, variantIds)
    );
  }
}

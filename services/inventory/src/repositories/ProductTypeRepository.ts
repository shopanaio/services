import { Executor, runWithContext, type FieldArgsTreeFor } from "@shopana/type-executor";
import { and, eq, isNull } from "drizzle-orm";
import type { TransactionManager } from "@shopana/shared-kernel";
import type { Database } from "../infrastructure/db/database.js";
import { getContext } from "../context/index.js";
import { product, variant } from "./models/index.js";
import { ProductLoaderFactory } from "./loaders/index.js";
import { ProductQueryFactory } from "./queries/index.js";
import {
  ProductView,
  VariantView,
  type AdminViewContext,
} from "../views/admin/index.js";

/** Field arguments tree for ProductView */
export type ProductFieldArgs = FieldArgsTreeFor<typeof ProductView>;

/** Field arguments tree for VariantView */
export type VariantFieldArgs = FieldArgsTreeFor<typeof VariantView>;

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
   * Create context for view resolution
   */
  private createContext(currency?: string): AdminViewContext {
    return {
      loaders: this.loaderFactory.createLoaders(),
      queries: this.queryFactory.createQueries(),
      locale: this.locale,
      currency,
    };
  }

  /**
   * Resolve a single product by ID
   * @param id - Product ID
   * @param options - Resolution options (currency, fieldArgs)
   */
  async resolveById(
    id: string,
    options?: { currency?: string; fieldArgs?: ProductFieldArgs }
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
      this.executor.resolve(ProductView, id, options?.fieldArgs)
    );
  }

  /**
   * Resolve multiple products by IDs
   * @param productIds - Array of product IDs
   * @param options - Resolution options (currency, fieldArgs)
   */
  async resolveMany(
    productIds: string[],
    options?: { currency?: string; fieldArgs?: ProductFieldArgs }
  ): Promise<Record<string, unknown>[]> {
    const context = this.createContext(options?.currency);
    return runWithContext(context, () =>
      this.executor.resolveMany(ProductView, productIds, options?.fieldArgs)
    );
  }

  /**
   * Resolve a single variant by ID
   * @param id - Variant ID
   * @param options - Resolution options (currency, fieldArgs)
   */
  async resolveVariantById(
    id: string,
    options?: { currency?: string; fieldArgs?: VariantFieldArgs }
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
      this.executor.resolve(VariantView, id, options?.fieldArgs)
    );
  }

  /**
   * Resolve multiple variants by IDs
   * @param variantIds - Array of variant IDs
   * @param options - Resolution options (currency, fieldArgs)
   */
  async resolveVariants(
    variantIds: string[],
    options?: { currency?: string; fieldArgs?: VariantFieldArgs }
  ): Promise<Record<string, unknown>[]> {
    const context = this.createContext(options?.currency);
    return runWithContext(context, () =>
      this.executor.resolveMany(VariantView, variantIds, options?.fieldArgs)
    );
  }
}

import type { GraphQLResolveInfo } from "graphql";
import { parseGraphQLInfoDeep, executor } from "@shopana/type-executor";
import type { TransactionManager } from "@shopana/shared-kernel";
import type { Database } from "../../infrastructure/db/database.js";
import { getContext } from "../../context/index.js";
import { ProductLoaderFactory } from "../../repositories/loaders/index.js";
import { ProductQueryFactory } from "../../repositories/queries/index.js";
import type { ViewContext } from "./context.js";
import { ProductView } from "./ProductView.js";
import { VariantView } from "./VariantView.js";

/**
 * View resolver - resolves Views from GraphQL queries
 * Handles context creation and GraphQL info parsing
 */
export class ViewResolver {
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
   * Create view context with loaders and queries
   */
  private createContext(currency?: string): ViewContext {
    return {
      loaders: this.loaderFactory.createLoaders(),
      queries: this.queryFactory.createQueries(),
      locale: getContext().locale ?? "uk",
      currency,
    };
  }

  /**
   * Resolve a product by ID
   */
  async product(
    id: string,
    info: GraphQLResolveInfo,
    options?: { currency?: string }
  ): Promise<Record<string, unknown>> {
    const fieldArgs = parseGraphQLInfoDeep(info, ProductView);
    const ctx = this.createContext(options?.currency);
    return executor.resolve(ProductView, id, fieldArgs, ctx);
  }

  /**
   * Resolve multiple products by IDs
   */
  async products(
    ids: string[],
    info: GraphQLResolveInfo,
    options?: { currency?: string }
  ): Promise<Record<string, unknown>[]> {
    const fieldArgs = parseGraphQLInfoDeep(info, ProductView);
    const ctx = this.createContext(options?.currency);
    return executor.resolveMany(ProductView, ids, fieldArgs, ctx);
  }

  /**
   * Resolve a variant by ID
   */
  async variant(
    id: string,
    info: GraphQLResolveInfo,
    options?: { currency?: string }
  ): Promise<Record<string, unknown>> {
    const fieldArgs = parseGraphQLInfoDeep(info, VariantView);
    const ctx = this.createContext(options?.currency);
    return executor.resolve(VariantView, id, fieldArgs, ctx);
  }

  /**
   * Resolve multiple variants by IDs
   */
  async variants(
    ids: string[],
    info: GraphQLResolveInfo,
    options?: { currency?: string }
  ): Promise<Record<string, unknown>[]> {
    const fieldArgs = parseGraphQLInfoDeep(info, VariantView);
    const ctx = this.createContext(options?.currency);
    return executor.resolveMany(VariantView, ids, fieldArgs, ctx);
  }
}

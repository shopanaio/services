import type { Table } from "drizzle-orm";
import type {
  DrizzleExecutor,
  FieldsDef,
  NestedPaths,
  NestedWhereInput,
  OrderPath,
} from "../types.js";
import { createCursorQueryBuilder } from "../cursor/builder.js";
import type { Connection } from "../cursor/connection.js";
import { FluentQueryBuilder } from "./fluent-query-builder.js";
import type { FluentFieldsDef, ToFieldsDef, PaginationQuerySnapshot } from "./fluent-types.js";

/**
 * Pagination query builder configuration
 */
export type PaginationQueryConfig = {
  /** Cursor type identifier (defaults to table name) */
  name?: string;
  /** Tie-breaker field for stable sorting (defaults to "id", throws if field doesn't exist) */
  tieBreaker?: string;
};

/**
 * Pagination query input with type-safe fields
 */
export type PaginationInput<InferredFields extends FieldsDef> = {
  /** Number of items to fetch (forward pagination) */
  first?: number;
  /** Cursor to start after (forward pagination) */
  after?: string;
  /** Number of items to fetch (backward pagination) */
  last?: number;
  /** Cursor to start before (backward pagination) */
  before?: string;
  /** Filter conditions */
  where?: NestedWhereInput<InferredFields>;
  /** Sort order (e.g., ["createdAt:desc"]) */
  order?: OrderPath<NestedPaths<InferredFields>>[];
  /** Fields to select */
  select?: NestedPaths<InferredFields>[];
  /** Current filters for hash comparison */
  filters?: Record<string, unknown>;
};

/**
 * Pagination query result
 */
export type PaginationResult<T> = Connection<T> & {
  /** True if cursor was ignored due to filter change */
  filtersChanged: boolean;
};

/**
 * Pagination Query Builder
 *
 * Wraps FluentQueryBuilder with cursor-based pagination support.
 *
 * @example
 * ```ts
 * const productsPagination = createPaginationQuery(productsQuery, {
 *   name: "product",
 *   tieBreaker: "id",
 * });
 *
 * const result = await productsPagination.execute(db, {
 *   first: 10,
 *   where: { status: "active" },
 *   order: ["createdAt:desc"],
 * });
 *
 * console.log(result.edges);
 * console.log(result.pageInfo);
 * ```
 */
export class PaginationQueryBuilder<
  T extends Table,
  Fields extends FluentFieldsDef,
  InferredFields extends FieldsDef = ToFieldsDef<Fields>,
  Types = T["$inferSelect"],
> {
  private readonly queryBuilder: FluentQueryBuilder<T, Fields, InferredFields, Types>;
  private readonly cursorType: string;
  private readonly tieBreaker: string;

  constructor(
    queryBuilder: FluentQueryBuilder<T, Fields, InferredFields, Types>,
    config?: PaginationQueryConfig
  ) {
    const snapshot = queryBuilder.getSnapshot();
    const tieBreaker = config?.tieBreaker ?? "id";

    if (!snapshot.fields.includes(tieBreaker)) {
      throw new Error(
        `Tie-breaker field '${tieBreaker}' not found in schema. ` +
        `Available fields: ${snapshot.fields.join(", ")}`
      );
    }

    this.queryBuilder = queryBuilder;
    this.cursorType = config?.name ?? queryBuilder.getTableName();
    this.tieBreaker = tieBreaker;
  }

  /**
   * Execute paginated query
   *
   * @example
   * ```ts
   * const result = await pagination.execute(db, {
   *   first: 10,
   *   after: cursor,
   *   where: { status: "active" },
   * });
   * ```
   */
  async execute(
    db: DrizzleExecutor,
    input: PaginationInput<InferredFields>
  ): Promise<PaginationResult<Types>> {
    const schema = this.queryBuilder.getSchema();
    const snapshot = this.queryBuilder.getSnapshot();

    // Build cursor query builder using the underlying schema
    // Only pass queryConfig values if they're defined to avoid overriding defaults
    const queryConfig: { maxLimit?: number; defaultLimit?: number } = {};
    if (snapshot.config.maxLimit !== undefined) {
      queryConfig.maxLimit = snapshot.config.maxLimit;
    }
    if (snapshot.config.defaultLimit !== undefined) {
      queryConfig.defaultLimit = snapshot.config.defaultLimit;
    }

    const cursorQb = createCursorQueryBuilder(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      schema as any,
      {
        cursorType: this.cursorType,
        tieBreaker: this.tieBreaker as never,
        queryConfig: Object.keys(queryConfig).length > 0 ? queryConfig : undefined,
      }
    );

    // Merge where with default where from fluent builder
    let where = input.where;
    if (!where && snapshot.config.defaultWhere) {
      where = snapshot.config.defaultWhere;
    }

    // Merge order with default order from fluent builder
    let order = input.order;
    if (!order && snapshot.config.defaultOrder) {
      order = [snapshot.config.defaultOrder];
    }

    // Resolve select with include/exclude from fluent builder
    let select: string[] | undefined = input.select
      ? (input.select as string[])
      : snapshot.config.defaultSelect
        ? (snapshot.config.defaultSelect as string[])
        : undefined;

    if (select) {
      if (snapshot.config.include) {
        const selectSet = new Set(select);
        for (const field of snapshot.config.include as string[]) {
          selectSet.add(field);
        }
        select = Array.from(selectSet);
      }
      if (snapshot.config.exclude) {
        const excludeSet = new Set(snapshot.config.exclude as string[]);
        select = select.filter((f) => !excludeSet.has(f));
      }
    }

    const result = await cursorQb.query(db, {
      first: input.first,
      after: input.after,
      last: input.last,
      before: input.before,
      where: where as NestedWhereInput<FieldsDef>,
      order: order as never,
      select: select as never,
      filters: input.filters,
    });

    return result as unknown as PaginationResult<Types>;
  }

  /**
   * Get SQL without executing
   */
  getSql(input: PaginationInput<InferredFields>) {
    const schema = this.queryBuilder.getSchema();
    const snapshot = this.queryBuilder.getSnapshot();

    // Only pass queryConfig values if they're defined to avoid overriding defaults
    const queryConfig: { maxLimit?: number; defaultLimit?: number } = {};
    if (snapshot.config.maxLimit !== undefined) {
      queryConfig.maxLimit = snapshot.config.maxLimit;
    }
    if (snapshot.config.defaultLimit !== undefined) {
      queryConfig.defaultLimit = snapshot.config.defaultLimit;
    }

    const cursorQb = createCursorQueryBuilder(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      schema as any,
      {
        cursorType: this.cursorType,
        tieBreaker: this.tieBreaker as never,
        queryConfig: Object.keys(queryConfig).length > 0 ? queryConfig : undefined,
      }
    );

    // Apply same merging logic as execute()
    let where = input.where;
    if (!where && snapshot.config.defaultWhere) {
      where = snapshot.config.defaultWhere;
    }

    let order = input.order;
    if (!order && snapshot.config.defaultOrder) {
      order = [snapshot.config.defaultOrder];
    }

    let select: string[] | undefined = input.select
      ? (input.select as string[])
      : snapshot.config.defaultSelect
        ? (snapshot.config.defaultSelect as string[])
        : undefined;

    if (select) {
      if (snapshot.config.include) {
        const selectSet = new Set(select);
        for (const field of snapshot.config.include as string[]) {
          selectSet.add(field);
        }
        select = Array.from(selectSet);
      }
      if (snapshot.config.exclude) {
        const excludeSet = new Set(snapshot.config.exclude as string[]);
        select = select.filter((f) => !excludeSet.has(f));
      }
    }

    return cursorQb.getSql({
      first: input.first,
      after: input.after,
      last: input.last,
      before: input.before,
      where: where as NestedWhereInput<FieldsDef>,
      order: order as never,
      select: select as never,
      filters: input.filters,
    });
  }

  /**
   * Get the underlying FluentQueryBuilder
   */
  getQueryBuilder(): FluentQueryBuilder<T, Fields, InferredFields, Types> {
    return this.queryBuilder;
  }

  /**
   * Get snapshot of current configuration state
   */
  getSnapshot(): PaginationQuerySnapshot<InferredFields> {
    return {
      name: this.cursorType,
      tieBreaker: this.tieBreaker,
      querySnapshot: this.queryBuilder.getSnapshot(),
    };
  }

  /**
   * Get configuration
   */
  getConfig(): PaginationQueryConfig {
    return {
      name: this.cursorType,
      tieBreaker: this.tieBreaker,
    };
  }
}

/**
 * Create a pagination query builder from a FluentQueryBuilder
 *
 * @example
 * ```ts
 * const productsQuery = createQuery(products, {
 *   id: field("id"),
 *   name: field("name"),
 *   price: field("price"),
 * })
 *   .defaultOrder("id:asc")
 *   .maxLimit(100);
 *
 * const productsPagination = createPaginationQuery(productsQuery, {
 *   name: "product",
 *   tieBreaker: "id",
 * });
 *
 * const result = await productsPagination.execute(db, { first: 10 });
 * ```
 */
export function createPaginationQuery<
  T extends Table,
  Fields extends FluentFieldsDef,
  InferredFields extends FieldsDef = ToFieldsDef<Fields>,
  Types = T["$inferSelect"],
>(
  queryBuilder: FluentQueryBuilder<T, Fields, InferredFields, Types>,
  config?: PaginationQueryConfig
): PaginationQueryBuilder<T, Fields, InferredFields, Types> {
  return new PaginationQueryBuilder(queryBuilder, config);
}

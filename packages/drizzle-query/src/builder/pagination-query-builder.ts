import type { Table } from "drizzle-orm";
import type {
  DrizzleExecutor,
  FieldsDef,
  NestedPaths,
  NestedWhereInput,
  OrderPath,
} from "../types.js";
import { createRelayBuilder } from "../cursor/relay-builder.js";
import {
  createBaseCursorBuilder,
  type BaseCursorResult,
  type CursorDirection,
} from "../cursor/base-builder.js";
import type { Connection } from "../cursor/connection.js";
import { FluentQueryBuilder } from "./fluent-query-builder.js";
import type { FluentFieldsDef, ToFieldsDef } from "./fluent-types.js";

// ============================================================================
// Relay Query
// ============================================================================

/**
 * Relay query builder configuration
 */
export type RelayQueryConfig = {
  /** Cursor type identifier (defaults to table name) */
  name?: string;
  /** Tie-breaker field for stable sorting (defaults to "id", throws if field doesn't exist) */
  tieBreaker?: string;
};

/**
 * Relay query input with type-safe fields (first/after, last/before)
 */
export type RelayQueryInput<InferredFields extends FieldsDef> = {
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
 * Relay query result (Connection + filtersChanged)
 */
export type RelayQueryResult<T> = Connection<T> & {
  /** True if cursor was ignored due to filter change */
  filtersChanged: boolean;
};

/**
 * Relay query snapshot for debugging/inspection
 */
export type RelayQuerySnapshot<InferredFields extends FieldsDef> = {
  name: string;
  tieBreaker: string;
  querySnapshot: {
    tableName: string;
    fields: (keyof InferredFields & string)[];
    config: Record<string, unknown>;
  };
};

/**
 * Relay Query Builder
 *
 * Wraps FluentQueryBuilder with Relay-style cursor pagination.
 * Uses first/after for forward pagination and last/before for backward pagination.
 *
 * @example
 * ```ts
 * const productsPagination = createRelayQuery(productsQuery, {
 *   tieBreaker: "id",
 * });
 *
 * const result = await productsPagination.execute(db, {
 *   first: 10,
 *   where: { status: "active" },
 * });
 *
 * console.log(result.edges);
 * console.log(result.pageInfo);
 * ```
 */
export class RelayQueryBuilder<
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
    config?: RelayQueryConfig
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
   * Execute Relay-paginated query
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
    input: RelayQueryInput<InferredFields>
  ): Promise<RelayQueryResult<Types>> {
    const schema = this.queryBuilder.getSchema();
    const snapshot = this.queryBuilder.getSnapshot();

    const queryConfig: { maxLimit?: number; defaultLimit?: number } = {};
    if (snapshot.config.maxLimit !== undefined) {
      queryConfig.maxLimit = snapshot.config.maxLimit;
    }
    if (snapshot.config.defaultLimit !== undefined) {
      queryConfig.defaultLimit = snapshot.config.defaultLimit;
    }

    const cursorQb = createRelayBuilder(
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

    return result as unknown as RelayQueryResult<Types>;
  }

  /**
   * Get SQL without executing
   */
  getSql(input: RelayQueryInput<InferredFields>) {
    const schema = this.queryBuilder.getSchema();
    const snapshot = this.queryBuilder.getSnapshot();

    const queryConfig: { maxLimit?: number; defaultLimit?: number } = {};
    if (snapshot.config.maxLimit !== undefined) {
      queryConfig.maxLimit = snapshot.config.maxLimit;
    }
    if (snapshot.config.defaultLimit !== undefined) {
      queryConfig.defaultLimit = snapshot.config.defaultLimit;
    }

    const cursorQb = createRelayBuilder(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      schema as any,
      {
        cursorType: this.cursorType,
        tieBreaker: this.tieBreaker as never,
        queryConfig: Object.keys(queryConfig).length > 0 ? queryConfig : undefined,
      }
    );

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
  getSnapshot(): RelayQuerySnapshot<InferredFields> {
    return {
      name: this.cursorType,
      tieBreaker: this.tieBreaker,
      querySnapshot: this.queryBuilder.getSnapshot(),
    };
  }

  /**
   * Get configuration
   */
  getConfig(): RelayQueryConfig {
    return {
      name: this.cursorType,
      tieBreaker: this.tieBreaker,
    };
  }
}

/**
 * Create a Relay-style cursor pagination query from a FluentQueryBuilder
 *
 * Uses first/after for forward pagination and last/before for backward pagination.
 * Returns edges with cursors and pageInfo (Relay Connection spec).
 *
 * @example
 * ```ts
 * const productsQuery = createQuery(products)
 *   .defaultOrder("createdAt:desc")
 *   .maxLimit(100);
 *
 * const productsPagination = createRelayQuery(productsQuery, {
 *   tieBreaker: "id",
 * });
 *
 * // Forward pagination
 * const page1 = await productsPagination.execute(db, { first: 10 });
 * const page2 = await productsPagination.execute(db, {
 *   first: 10,
 *   after: page1.pageInfo.endCursor,
 * });
 * ```
 */
export function createRelayQuery<
  T extends Table,
  Fields extends FluentFieldsDef,
  InferredFields extends FieldsDef = ToFieldsDef<Fields>,
  Types = T["$inferSelect"],
>(
  queryBuilder: FluentQueryBuilder<T, Fields, InferredFields, Types>,
  config?: RelayQueryConfig
): RelayQueryBuilder<T, Fields, InferredFields, Types> {
  return new RelayQueryBuilder(queryBuilder, config);
}

// ============================================================================
// Cursor Query (base cursor pagination)
// ============================================================================

/**
 * Cursor query builder configuration
 */
export type CursorQueryConfig = {
  /** Cursor type identifier (defaults to table name) */
  name?: string;
  /** Tie-breaker field for stable sorting (defaults to "id", throws if field doesn't exist) */
  tieBreaker?: string;
};

/**
 * Cursor query input with type-safe fields
 */
export type CursorQueryInput<InferredFields extends FieldsDef> = {
  /** Number of items to fetch */
  limit: number;
  /** Pagination direction */
  direction: CursorDirection;
  /** Cursor to continue from (opaque string) */
  cursor?: string;
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
 * Cursor query result
 */
export type CursorQueryResult<T> = BaseCursorResult<T>;

/**
 * Cursor query snapshot for debugging/inspection
 */
export type CursorQuerySnapshot<InferredFields extends FieldsDef> = {
  name: string;
  tieBreaker: string;
  querySnapshot: {
    tableName: string;
    fields: (keyof InferredFields & string)[];
    config: Record<string, unknown>;
  };
};

/**
 * Cursor Query Builder
 *
 * Wraps FluentQueryBuilder with base cursor pagination support.
 * Uses limit/direction/cursor instead of Relay's first/after, last/before.
 *
 * @example
 * ```ts
 * const productsCursor = createCursorQuery(productsQuery, {
 *   tieBreaker: "id",
 * });
 *
 * const result = await productsCursor.execute(db, {
 *   limit: 10,
 *   direction: "forward",
 * });
 *
 * console.log(result.items);
 * console.log(result.hasMore);
 * ```
 */
export class CursorQueryBuilder<
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
    config?: CursorQueryConfig
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
   * Execute cursor-paginated query
   *
   * @example
   * ```ts
   * const result = await cursor.execute(db, {
   *   limit: 10,
   *   direction: "forward",
   *   cursor: previousCursor,
   *   where: { status: "active" },
   * });
   * ```
   */
  async execute(
    db: DrizzleExecutor,
    input: CursorQueryInput<InferredFields>
  ): Promise<CursorQueryResult<Types>> {
    const schema = this.queryBuilder.getSchema();
    const snapshot = this.queryBuilder.getSnapshot();

    const queryConfig: { maxLimit?: number; defaultLimit?: number } = {};
    if (snapshot.config.maxLimit !== undefined) {
      queryConfig.maxLimit = snapshot.config.maxLimit;
    }
    if (snapshot.config.defaultLimit !== undefined) {
      queryConfig.defaultLimit = snapshot.config.defaultLimit;
    }

    const cursorQb = createBaseCursorBuilder(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      schema as any,
      {
        cursorType: this.cursorType,
        tieBreaker: this.tieBreaker as never,
        queryConfig: Object.keys(queryConfig).length > 0 ? queryConfig : undefined,
      }
    );

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

    const result = await cursorQb.query(db, {
      limit: input.limit,
      direction: input.direction,
      cursor: input.cursor,
      where: where as NestedWhereInput<FieldsDef>,
      order: order as never,
      select: select as never,
      filters: input.filters,
    });

    return result as unknown as CursorQueryResult<Types>;
  }

  /**
   * Get SQL without executing
   */
  getSql(input: CursorQueryInput<InferredFields>) {
    const schema = this.queryBuilder.getSchema();
    const snapshot = this.queryBuilder.getSnapshot();

    const queryConfig: { maxLimit?: number; defaultLimit?: number } = {};
    if (snapshot.config.maxLimit !== undefined) {
      queryConfig.maxLimit = snapshot.config.maxLimit;
    }
    if (snapshot.config.defaultLimit !== undefined) {
      queryConfig.defaultLimit = snapshot.config.defaultLimit;
    }

    const cursorQb = createBaseCursorBuilder(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      schema as any,
      {
        cursorType: this.cursorType,
        tieBreaker: this.tieBreaker as never,
        queryConfig: Object.keys(queryConfig).length > 0 ? queryConfig : undefined,
      }
    );

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
      limit: input.limit,
      direction: input.direction,
      cursor: input.cursor,
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
  getSnapshot(): CursorQuerySnapshot<InferredFields> {
    return {
      name: this.cursorType,
      tieBreaker: this.tieBreaker,
      querySnapshot: this.queryBuilder.getSnapshot(),
    };
  }

  /**
   * Get configuration
   */
  getConfig(): CursorQueryConfig {
    return {
      name: this.cursorType,
      tieBreaker: this.tieBreaker,
    };
  }
}

/**
 * Create a base cursor pagination query from a FluentQueryBuilder
 *
 * Uses limit/direction/cursor for pagination.
 * Returns items array with hasMore flag (simpler than Relay Connection).
 *
 * @example
 * ```ts
 * const productsQuery = createQuery(products)
 *   .defaultOrder("createdAt:desc")
 *   .maxLimit(100);
 *
 * const productsCursor = createCursorQuery(productsQuery, {
 *   tieBreaker: "id",
 * });
 *
 * // Forward pagination
 * const page1 = await productsCursor.execute(db, {
 *   limit: 10,
 *   direction: "forward",
 * });
 *
 * const page2 = await productsCursor.execute(db, {
 *   limit: 10,
 *   direction: "forward",
 *   cursor: page1.endCursor,
 * });
 * ```
 */
export function createCursorQuery<
  T extends Table,
  Fields extends FluentFieldsDef,
  InferredFields extends FieldsDef = ToFieldsDef<Fields>,
  Types = T["$inferSelect"],
>(
  queryBuilder: FluentQueryBuilder<T, Fields, InferredFields, Types>,
  config?: CursorQueryConfig
): CursorQueryBuilder<T, Fields, InferredFields, Types> {
  return new CursorQueryBuilder(queryBuilder, config);
}


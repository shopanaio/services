import type { Table } from "drizzle-orm";
import { createQueryBuilder } from "../builder/index.js";
import type { ObjectSchema } from "../schema.js";
import type {
  DrizzleExecutor,
  FieldsDef,
  NestedPaths,
  NestedWhereInput,
  OrderByItem,
  QueryBuilderConfig,
} from "../types.js";
import { decode, encode, InvalidCursorError } from "./cursor.js";
import {
  getNestedValue,
  hashFilters,
  invertOrder,
  tieBreakerOrder,
} from "./helpers.js";
import { parseSort, validateCursorOrder } from "./sort.js";
import type {
  CursorDirection,
  CursorParams,
  SeekValue,
  SortParam,
} from "./types.js";
import { buildCursorWhereInput } from "./where.js";

// Re-export types
export type { CursorDirection } from "./types.js";

export type BaseCursorBuilderConfig<Fields extends FieldsDef, Types> = {
  /** Cursor type identifier (e.g., "product", "category") */
  cursorType: string;
  /** Tie-breaker field for stable sorting (usually "id") */
  tieBreaker: NestedPaths<Fields>;
  /** Optional: transform row before returning */
  mapResult?: (row: Types) => unknown;
  /** QueryBuilder config (maxLimit, defaultLimit, etc.) */
  queryConfig?: QueryBuilderConfig;
};

export type BaseCursorInput<F extends FieldsDef> = {
  /** Cursor to continue from (opaque string) */
  cursor?: string | null;
  /** Number of items to fetch */
  limit: number;
  /** Pagination direction */
  direction: CursorDirection;
  /** Filter conditions */
  where?: NestedWhereInput<F> | null;
  /** Sort order */
  orderBy?: OrderByItem<NestedPaths<F>>[] | null;
  /** Fields to select */
  select?: NestedPaths<F>[] | null;
  /** Current filters for hash comparison (optional) */
  filters?: Record<string, unknown> | null;
};

export type BaseCursorResult<T> = {
  /** Fetched items (already in correct order) */
  items: T[];
  /** Cursor for each item (same order as items) */
  cursors: string[];
  /** True if there are more items in this direction */
  hasMore: boolean;
  /** Cursor for first item (null if empty) */
  startCursor: string | null;
  /** Cursor for last item (null if empty) */
  endCursor: string | null;
  /** True if cursor was ignored due to filter change */
  filtersChanged: boolean;
  /** Sort params used for this query */
  sortParams: SortParam[];
  /** Filters hash */
  filtersHash: string;
};

/** @internal - Metadata returned alongside SQL for debugging/testing */
export type BaseCursorSqlMeta = {
  direction: CursorDirection;
  limit: number;
  filtersHash: string;
  filtersChanged: boolean;
  hasCursor: boolean;
  invertOrder: boolean;
  sortParams: SortParam[];
};

// ============ Internal Helpers ============

function buildSeekValuesFromRow(
  row: unknown,
  sortParams: SortParam[],
  tieBreaker: string,
  cursorType: string,
  filtersHash: string
): { cursor: string; seekValues: SeekValue[] } {
  const tieBreakerDir = tieBreakerOrder(sortParams);

  const seekValues: SeekValue[] = sortParams.map((param) => ({
    field: param.field,
    value: getNestedValue(row, param.field),
    direction: param.direction,
  }));

  seekValues.push({
    field: tieBreaker,
    value: getNestedValue(row, tieBreaker),
    direction: tieBreakerDir,
  });

  const cursor = encode({
    type: cursorType,
    filtersHash,
    seek: seekValues,
  });

  return { cursor, seekValues };
}

// ============ Builder ============

export function createBaseCursorBuilder<
  T extends Table,
  F extends string,
  Fields extends FieldsDef,
  Types = T["$inferSelect"],
  Result = Types
>(
  schema: ObjectSchema<T, F, Fields, Types>,
  config: BaseCursorBuilderConfig<Fields, Types>
) {
  type Row = Types;

  const qb = createQueryBuilder(schema, config.queryConfig);
  const mapResult =
    config.mapResult ?? ((row: Row) => row as unknown as Result);

  function parseSortOrder(
    order: OrderByItem<string>[] | undefined
  ): SortParam[] {
    return parseSort(order, config.tieBreaker as string);
  }

  function buildOrderPath(
    sortParams: SortParam[],
    invert: boolean
  ): OrderByItem<string>[] {
    const tieBreakerDir = tieBreakerOrder(sortParams);
    const entries = [
      ...sortParams,
      { field: config.tieBreaker as string, direction: tieBreakerDir },
    ];
    return entries.map((entry) => ({
      field: entry.field,
      direction: invert ? invertOrder(entry.direction) : entry.direction,
    }));
  }

  function mergeWhere(
    userWhere: NestedWhereInput<Fields> | null | undefined,
    cursorWhere: NestedWhereInput<Fields> | null
  ): NestedWhereInput<Fields> | null {
    if (!cursorWhere && !userWhere) {
      return null;
    }
    if (!cursorWhere) {
      return userWhere || null;
    }
    if (!userWhere) {
      return cursorWhere;
    }
    return { _and: [userWhere, cursorWhere] } as NestedWhereInput<Fields>;
  }

  /**
   * Prepares query components from base cursor input.
   */
  function prepareQuery(input: BaseCursorInput<Fields>) {
    if (input.limit <= 0) {
      throw new InvalidCursorError("limit must be greater than 0");
    }

    const isForward = input.direction === "forward";

    // Parse sort
    const sortParams = parseSortOrder(
      input.orderBy as OrderByItem<string>[] | undefined
    );
    const filtersHash = hashFilters(input.filters);

    // Decode cursor if present
    let cursor: CursorParams | null = null;
    let filtersChanged = false;

    if (input.cursor) {
      cursor = decode(input.cursor);
      if (cursor.type !== config.cursorType) {
        throw new InvalidCursorError(
          `Expected cursor type '${config.cursorType}', got '${cursor.type}'`
        );
      }

      // Check filters hash
      if (cursor.filtersHash !== filtersHash) {
        cursor = null;
        filtersChanged = true;
      }
    }

    // Validate cursor order matches current sort
    if (cursor) {
      validateCursorOrder(cursor, sortParams, config.tieBreaker as string);
    }

    // Build cursor WHERE
    const cursorWhere = cursor
      ? buildCursorWhereInput<Fields>(cursor, isForward)
      : null;

    // Merge WHERE conditions
    const where = mergeWhere(input.where, cursorWhere);

    // Determine if order needs inversion:
    // - backward without cursor: invert to get last N items
    // - backward with cursor: invert to get items BEFORE the cursor
    const invertOrderFlag = !isForward;

    // Build ORDER
    const order = buildOrderPath(sortParams, invertOrderFlag) as OrderByItem<
      NestedPaths<Fields>
    >[];

    return {
      isForward,
      limit: input.limit,
      sortParams,
      filtersHash,
      cursor,
      filtersChanged,
      where,
      order,
      invertOrderFlag,
    };
  }

  return {
    /**
     * Get SQL without executing - useful for testing and debugging.
     */
    getSql(input: BaseCursorInput<Fields>): {
      sql: unknown;
      meta: BaseCursorSqlMeta;
    } {
      const prepared = prepareQuery(input);

      const sql = qb.buildSelectSql({
        where: prepared.where,
        order: prepared.order,
        limit: prepared.limit + 1,
        select: input.select,
      });

      return {
        sql,
        meta: {
          direction: input.direction,
          limit: prepared.limit,
          filtersHash: prepared.filtersHash,
          filtersChanged: prepared.filtersChanged,
          hasCursor: prepared.cursor !== null,
          invertOrder: prepared.invertOrderFlag,
          sortParams: prepared.sortParams,
        },
      };
    },

    /**
     * Execute cursor-paginated query and return simple result.
     */
    async query(
      db: DrizzleExecutor,
      input: BaseCursorInput<Fields>
    ): Promise<BaseCursorResult<Result>> {
      const prepared = prepareQuery(input);

      // Execute query with limit + 1 for hasMore detection
      const rows = await qb.query(db, {
        where: prepared.where,
        order: prepared.order,
        limit: prepared.limit + 1,
        select: input.select,
      });

      // Check if we have more items
      const hasMore = rows.length > prepared.limit;

      // Trim to requested limit
      let items = hasMore ? rows.slice(0, prepared.limit) : rows;

      // Reverse if order was inverted (all backward pagination)
      // This restores the original sort order for the response
      if (prepared.invertOrderFlag) {
        items = [...items].reverse();
      }

      // Map results and build cursors for each item
      const mappedItems: Result[] = [];
      const cursors: string[] = [];

      for (const row of items) {
        mappedItems.push(mapResult(row) as Result);
        cursors.push(
          buildSeekValuesFromRow(
            row,
            prepared.sortParams,
            config.tieBreaker as string,
            config.cursorType,
            prepared.filtersHash
          ).cursor
        );
      }

      const startCursor = cursors.length > 0 ? cursors[0] : null;
      const endCursor = cursors.length > 0 ? cursors[cursors.length - 1] : null;

      return {
        items: mappedItems,
        cursors,
        hasMore,
        startCursor,
        endCursor,
        filtersChanged: prepared.filtersChanged,
        sortParams: prepared.sortParams,
        filtersHash: prepared.filtersHash,
      };
    },

    /**
     * Get the underlying QueryBuilder for advanced use cases (e.g., count).
     */
    getQueryBuilder() {
      return qb;
    },
  };
}

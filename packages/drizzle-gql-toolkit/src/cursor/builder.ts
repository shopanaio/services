import type { Table } from "drizzle-orm";
import type { ObjectSchema } from "../schema.js";
import type {
  FieldsDef,
  NestedPaths,
  NestedWhereInput,
  OrderPath,
  DrizzleExecutor,
  QueryBuilderConfig,
} from "../types.js";
import { createQueryBuilder } from "../builder.js";
import type { CursorParams } from "./cursor.js";
import { decode, InvalidCursorError } from "./cursor.js";
import type { SortParam } from "./helpers.js";
import { hashFilters, tieBreakerOrder, invertOrder } from "./helpers.js";
import { parseSort, validateCursorOrder } from "./sort.js";
import { buildCursorWhereInput } from "./where.js";
import {
  makeConnection,
  createCursorNode,
  type Connection,
  type CursorNode,
} from "./connection.js";

// ============ Types ============

export type CursorQueryBuilderConfig<
  Fields extends FieldsDef,
  Types,
> = {
  /** Cursor type identifier (e.g., "product", "category") */
  cursorType: string;
  /** Tie-breaker field for stable sorting (usually "id") */
  tieBreaker: NestedPaths<Fields>;
  /** Default sort field when none specified */
  defaultSortField: NestedPaths<Fields>;
  /** Optional: transform row before returning in Connection */
  mapResult?: (row: Types) => unknown;
  /** QueryBuilder config (maxLimit, defaultLimit, etc.) */
  queryConfig?: QueryBuilderConfig;
};

export type CursorQueryInput<F extends FieldsDef> = {
  /** Number of items to fetch (forward pagination) */
  first?: number;
  /** Cursor to start after (forward pagination) */
  after?: string;
  /** Number of items to fetch (backward pagination) */
  last?: number;
  /** Cursor to start before (backward pagination) */
  before?: string;
  /** Filter conditions */
  where?: NestedWhereInput<F>;
  /** Sort order */
  order?: OrderPath<NestedPaths<F>>[];
  /** Fields to select */
  select?: NestedPaths<F>[];
  /** Current filters for hash comparison (optional) */
  filters?: Record<string, unknown>;
};

export type CursorQueryResult<T> = Connection<T> & {
  /** True if cursor was ignored due to filter change */
  filtersChanged: boolean;
};

// ============ Builder ============

export function createCursorQueryBuilder<
  T extends Table,
  F extends string,
  Fields extends FieldsDef,
  Types = T["$inferSelect"],
  Result = Types
>(
  schema: ObjectSchema<T, F, Fields, Types>,
  config: CursorQueryBuilderConfig<Fields, Types>
) {
  type Row = Types;

  const qb = createQueryBuilder(schema, config.queryConfig);

  const mapResult = config.mapResult ?? ((row: Row) => row as unknown as Result);

  function parseSortOrder(order: string[] | undefined): SortParam[] {
    if (!order || order.length === 0) {
      return parseSort(undefined, config.defaultSortField as string);
    }
    // Join array to string format expected by parseSort
    return parseSort(order.join(","), config.defaultSortField as string);
  }

  function buildOrderPath(sortParams: SortParam[], invert: boolean): string[] {
    const tieBreakerDir = tieBreakerOrder(sortParams);
    const entries = [
      ...sortParams,
      { field: config.tieBreaker as string, order: tieBreakerDir },
    ];
    return entries.map((entry) => {
      const direction = invert ? invertOrder(entry.order) : entry.order;
      return `${entry.field}:${direction}`;
    });
  }

  function mergeWhere(
    userWhere: NestedWhereInput<Fields> | undefined,
    cursorWhere: NestedWhereInput<Fields> | null
  ): NestedWhereInput<Fields> | undefined {
    if (!cursorWhere && !userWhere) {
      return undefined;
    }
    if (!cursorWhere) {
      return userWhere;
    }
    if (!userWhere) {
      return cursorWhere;
    }
    return { $and: [userWhere, cursorWhere] } as NestedWhereInput<Fields>;
  }

  /**
   * Prepares query components from cursor input.
   * Shared between query() and buildSql().
   */
  function prepareQuery(input: CursorQueryInput<Fields>) {
    // Validate pagination params
    const hasFirst = typeof input.first === "number";
    const hasLast = typeof input.last === "number";

    if (hasFirst && hasLast) {
      throw new InvalidCursorError("Cannot specify both 'first' and 'last'");
    }
    if (!hasFirst && !hasLast) {
      throw new InvalidCursorError("Either 'first' or 'last' must be provided");
    }

    const isForward = hasFirst;
    const limit = isForward ? input.first! : input.last!;

    if (limit <= 0) {
      throw new InvalidCursorError(
        `${isForward ? "first" : "last"} must be greater than 0`
      );
    }

    // Parse sort
    const sortParams = parseSortOrder(input.order as string[] | undefined);
    const filtersHash = hashFilters(input.filters);

    // Decode cursor if present
    let cursor: CursorParams | null = null;
    let filtersChanged = false;

    if (isForward && input.after) {
      cursor = decode(input.after);
      if (cursor.type !== config.cursorType) {
        throw new InvalidCursorError(
          `Expected cursor type '${config.cursorType}', got '${cursor.type}'`
        );
      }
    } else if (!isForward && input.before) {
      cursor = decode(input.before);
      if (cursor.type !== config.cursorType) {
        throw new InvalidCursorError(
          `Expected cursor type '${config.cursorType}', got '${cursor.type}'`
        );
      }
    }

    // Check filters hash
    if (cursor && cursor.filtersHash !== filtersHash) {
      cursor = null;
      filtersChanged = true;
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

    // Determine if order needs inversion (last without before)
    const invertOrderFlag = !isForward && !input.before;

    // Build ORDER
    const order = buildOrderPath(sortParams, invertOrderFlag);

    return {
      isForward,
      limit,
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
     * Returns the SQL that would be executed by query().
     */
    getSql(input: CursorQueryInput<Fields>) {
      const prepared = prepareQuery(input);

      const sql = qb.buildSelectSql({
        where: prepared.where as NestedWhereInput<FieldsDef>,
        order: prepared.order as OrderPath<string>[],
        limit: prepared.limit + 1,
        select: input.select as string[],
      } as never);

      return {
        sql,
        meta: {
          isForward: prepared.isForward,
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
     * Execute cursor-paginated query and return Connection
     */
    async query(
      db: DrizzleExecutor,
      input: CursorQueryInput<Fields>
    ): Promise<CursorQueryResult<Result>> {
      const prepared = prepareQuery(input);

      // Execute query with limit + 1 for hasMore detection
      const rows = await qb.query(db, {
        where: prepared.where as NestedWhereInput<FieldsDef>,
        order: prepared.order as OrderPath<string>[],
        limit: prepared.limit + 1,
        select: input.select as string[],
      } as never) as Row[];

      // Build cursor nodes
      const nodes: CursorNode[] = rows.map((row) =>
        createCursorNode({
          row,
          cursorType: config.cursorType,
          sortParams: prepared.sortParams,
          tieBreaker: config.tieBreaker as string,
        })
      );

      // Build connection
      const connection = makeConnection({
        nodes,
        mapper: (node) => {
          const row = rows[nodes.indexOf(node)];
          return mapResult(row) as Result;
        },
        paging: {
          first: input.first,
          after: input.after,
          last: input.last,
          before: input.before,
        },
        filtersHash: prepared.filtersHash,
        sortParams: prepared.sortParams,
        tieBreaker: config.tieBreaker as string,
        invertOrder: prepared.invertOrderFlag,
      });

      return {
        ...connection,
        filtersChanged: prepared.filtersChanged,
      };
    },

    /**
     * Get the underlying QueryBuilder for advanced use cases (e.g., count)
     */
    getQueryBuilder() {
      return qb;
    },
  };
}

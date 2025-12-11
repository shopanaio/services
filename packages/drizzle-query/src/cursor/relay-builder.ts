import type { Table } from "drizzle-orm";
import type { ObjectSchema } from "../schema.js";
import type {
  FieldsDef,
  NestedPaths,
  NestedWhereInput,
  OrderByItem,
  DrizzleExecutor,
} from "../types.js";
import { InvalidCursorError } from "./cursor.js";
import {
  createBaseCursorBuilder,
  type BaseCursorBuilderConfig,
  type BaseCursorInput,
  type BaseCursorResult,
  type CursorDirection,
} from "./base-builder.js";
import type { Connection } from "./connection.js";

// ============ Types ============

export type RelayBuilderConfig<
  Fields extends FieldsDef,
  Types,
> = BaseCursorBuilderConfig<Fields, Types>;

export type RelayInput<F extends FieldsDef> = {
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
  order?: OrderByItem<NestedPaths<F>>[];
  /** Fields to select */
  select?: NestedPaths<F>[];
  /** Current filters for hash comparison (optional) */
  filters?: Record<string, unknown>;
};

export type RelayResult<T> = Connection<T> & {
  /** True if cursor was ignored due to filter change */
  filtersChanged: boolean;
};

// ============ Internal Helpers ============

function convertRelayToBase<F extends FieldsDef>(
  input: RelayInput<F>
): { baseInput: BaseCursorInput<F>; isForward: boolean } {
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

  return {
    baseInput: {
      limit,
      direction: isForward ? "forward" : "backward" as CursorDirection,
      cursor: isForward ? input.after : input.before,
      where: input.where,
      order: input.order,
      select: input.select,
      filters: input.filters,
    },
    isForward,
  };
}

function buildRelayConnection<T>(
  baseResult: BaseCursorResult<T>,
  relayInput: RelayInput<FieldsDef>
): Connection<T> {
  const isForward = typeof relayInput.first === "number";

  if (baseResult.items.length === 0) {
    return {
      edges: [],
      pageInfo: {
        hasNextPage: isForward ? false : Boolean(relayInput.before),
        hasPreviousPage: isForward ? Boolean(relayInput.after) : false,
        startCursor: null,
        endCursor: null,
      },
    };
  }

  // Build edges with cursors from base result
  const edges = baseResult.items.map((item, index) => ({
    cursor: baseResult.cursors[index],
    node: item,
  }));

  return {
    edges,
    pageInfo: {
      hasNextPage: isForward ? baseResult.hasMore : Boolean(relayInput.before),
      hasPreviousPage: isForward ? Boolean(relayInput.after) : baseResult.hasMore,
      startCursor: baseResult.startCursor,
      endCursor: baseResult.endCursor,
    },
  };
}

// ============ Builder ============

export function createRelayBuilder<
  T extends Table,
  F extends string,
  Fields extends FieldsDef,
  Types = T["$inferSelect"],
  Result = Types
>(
  schema: ObjectSchema<T, F, Fields, Types>,
  config: RelayBuilderConfig<Fields, Types>
) {
  const baseBuilder = createBaseCursorBuilder<T, F, Fields, Types, Result>(schema, config);

  return {
    /**
     * Get SQL without executing - useful for testing and debugging.
     */
    getSql(input: RelayInput<Fields>) {
      const { baseInput, isForward } = convertRelayToBase(input);
      const { sql, meta } = baseBuilder.getSql(baseInput);

      return {
        sql,
        meta: {
          isForward,
          limit: meta.limit,
          filtersHash: meta.filtersHash,
          filtersChanged: meta.filtersChanged,
          hasCursor: meta.hasCursor,
          invertOrder: meta.invertOrder,
          sortParams: meta.sortParams,
        },
      };
    },

    /**
     * Execute cursor-paginated query and return Relay Connection.
     */
    async query(
      db: DrizzleExecutor,
      input: RelayInput<Fields>
    ): Promise<RelayResult<Result>> {
      const { baseInput } = convertRelayToBase(input);
      const baseResult = await baseBuilder.query(db, baseInput);

      const connection = buildRelayConnection(
        baseResult,
        input as RelayInput<FieldsDef>
      );

      return {
        ...connection,
        filtersChanged: baseResult.filtersChanged,
      };
    },

    /**
     * Get the underlying QueryBuilder for advanced use cases (e.g., count).
     */
    getQueryBuilder() {
      return baseBuilder.getQueryBuilder();
    },

    /**
     * Get the underlying base cursor builder.
     */
    getBaseBuilder() {
      return baseBuilder;
    },
  };
}

import { encode } from "./cursor.js";
import type { SeekValue, SortParam } from "./types.js";
import { buildTieBreakerSeekValue, tieBreakerOrder, getNestedValue } from "./helpers.js";

export type PageInfo = {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor: string | null;
  endCursor: string | null;
};

export type Edge<T> = {
  cursor: string;
  node: T;
};

export type Connection<T> = {
  edges: Edge<T>[];
  pageInfo: PageInfo;
  totalCount?: number;
};

export interface CursorNode {
  getId(): string;
  getCursorType(): string;
  getSeekValues(): SeekValue[];
}

export type PagingInput = {
  first?: number;
  after?: string;
  last?: number;
  before?: string;
  totalCount?: number;
};

export type MakeConnectionInput<T extends CursorNode, K> = {
  nodes: T[];
  mapper: (node: T) => K;
  paging: PagingInput;
  filtersHash: string;
  tieBreaker: string;
  sortParams: SortParam[];
  invertOrder?: boolean;
};

function getLimit(nodes: unknown[], paging: PagingInput): { limit: number; isForward: boolean } {
  const hasLast = typeof paging.last === "number";
  const hasFirst = typeof paging.first === "number";

  if (hasLast) {
    return { limit: Math.max(0, paging.last ?? 0), isForward: false };
  }

  if (hasFirst) {
    return { limit: Math.max(0, paging.first ?? 0), isForward: true };
  }

  return { limit: nodes.length, isForward: true };
}

function trimNodes<T>(
  nodes: T[],
  limit: number,
  isForward: boolean,
  paging: PagingInput
): T[] {
  if (limit <= 0 || nodes.length <= limit) {
    return nodes;
  }

  if (isForward) {
    return nodes.slice(0, limit);
  }

  if (paging.before) {
    return nodes.slice(nodes.length - limit);
  }

  return nodes.slice(0, limit);
}

function buildEdgeCursor(
  node: CursorNode,
  filtersHash: string,
  tieBreaker: string,
  sortParams: SortParam[]
): string {
  const seekValues = node.getSeekValues();
  const values = seekValues.length > 0
    ? seekValues
    : [buildTieBreakerSeekValue({
        value: node.getId(),
        tieBreaker,
        sortParams,
      })];

  return encode({
    type: node.getCursorType(),
    filtersHash,
    seek: values,
  });
}

/**
 * Builds a Relay-style Connection from cursor nodes.
 *
 * @internal
 *
 * Handles forward pagination (first/after) and backward pagination (last/before).
 *
 * **Reverse Logic:**
 * When using backward pagination, nodes need to be reversed in certain cases:
 *
 * 1. `last` with `before` cursor:
 *    - SQL returns nodes in inverted order (oldest first for DESC sort)
 *    - We reverse to restore natural order (newest first)
 *
 * 2. `last` without `before` cursor (invertOrder=true):
 *    - prepareQuery inverts the SQL ORDER BY to get "last N" items
 *    - SQL returns [oldest...newer] but we want [newer...oldest]
 *    - We reverse to match expected order
 *
 * The condition `!isForward && (input.invertOrder ?? !paging.before)` handles both:
 * - invertOrder=true → always reverse (case 2)
 * - invertOrder=undefined + no before → reverse (fallback for case 2)
 * - invertOrder=false or has before → don't reverse (case 1 handled by trimNodes)
 */
export function makeConnection<T extends CursorNode, K>(
  input: MakeConnectionInput<T, K>
): Connection<K> {
  const nodes = [...input.nodes];
  const { paging } = input;
  const { limit, isForward } = getLimit(nodes, paging);
  const hasMore = nodes.length > limit;
  let sliced = trimNodes(nodes, limit, isForward, paging);

  // Reverse nodes for backward pagination when order was inverted in SQL query
  // See function JSDoc for detailed explanation
  if (!isForward && (input.invertOrder ?? !paging.before)) {
    sliced = [...sliced].reverse();
  }

  const hasNextPage = isForward ? hasMore : Boolean(paging.before);
  const hasPreviousPage = isForward ? Boolean(paging.after) : hasMore;

  if (sliced.length === 0) {
    return {
      edges: [],
      pageInfo: {
        hasNextPage,
        hasPreviousPage,
        startCursor: null,
        endCursor: null,
      },
      totalCount: paging.totalCount,
    };
  }

  const edges = sliced.map((node) => ({
    cursor: buildEdgeCursor(node, input.filtersHash, input.tieBreaker, input.sortParams),
    node: input.mapper(node),
  }));

  return {
    edges,
    pageInfo: {
      hasNextPage,
      hasPreviousPage,
      startCursor: edges[0]?.cursor ?? null,
      endCursor: edges[edges.length - 1]?.cursor ?? null,
    },
    totalCount: paging.totalCount,
  };
}

export type CreateCursorNodeOptions = {
  row: unknown;
  cursorType: string;
  sortParams: SortParam[];
  tieBreaker: string;
};

/** @internal */
export function createCursorNode(options: CreateCursorNodeOptions): CursorNode {
  const { row, cursorType, sortParams, tieBreaker } = options;
  const tieBreakerDir = tieBreakerOrder(sortParams);

  return {
    getId: () => String(getNestedValue(row, tieBreaker) ?? ""),
    getCursorType: () => cursorType,
    getSeekValues: () => {
      const values: SeekValue[] = sortParams.map((param) => ({
        field: param.field,
        value: getNestedValue(row, param.field),
        order: param.order,
      }));

      values.push(
        buildTieBreakerSeekValue({
          value: getNestedValue(row, tieBreaker),
          tieBreaker,
          sortParams,
          order: tieBreakerDir,
        })
      );

      return values;
    },
  };
}

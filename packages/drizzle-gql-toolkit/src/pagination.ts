import type { PaginationInput, ResolvedPagination } from "./types.js";

export type PaginationConfig = {
  maxLimit?: number;
  defaultLimit?: number;
};

const DEFAULT_CONFIG: Required<PaginationConfig> = {
  maxLimit: 100,
  defaultLimit: 20,
};

/**
 * Resolve pagination input to limit/offset values
 *
 * @example
 * ```ts
 * resolvePagination({ limit: 50, offset: 100 })
 * // => { limit: 50, offset: 100 }
 * ```
 */
export function resolvePagination(
  input: PaginationInput | undefined | null,
  config?: PaginationConfig
): ResolvedPagination {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  if (!input) {
    return {
      limit: cfg.defaultLimit,
      offset: 0,
    };
  }

  let limit = input.limit ?? cfg.defaultLimit;
  limit = Math.min(limit, cfg.maxLimit);
  const offset = Math.max(0, input.offset ?? 0);

  return { limit, offset };
}

/**
 * Page info for GraphQL-style pagination response
 */
export type PageInfo = {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  totalCount: number;
};

/**
 * Calculate page info from total count and current pagination
 *
 * @example
 * ```ts
 * const items = await db.select().from(products).limit(10).offset(20);
 * const count = await db.select({ count: sql`count(*)` }).from(products);
 *
 * const pageInfo = calculatePageInfo(count[0].count, { limit: 10, offset: 20 });
 * // => { hasNextPage: true, hasPreviousPage: true, totalCount: 100 }
 * ```
 */
export function calculatePageInfo(
  totalCount: number,
  pagination: PaginationInput | undefined | null,
  config?: PaginationConfig
): PageInfo {
  const { limit, offset } = resolvePagination(pagination, config);

  return {
    hasNextPage: offset + limit < totalCount,
    hasPreviousPage: offset > 0,
    totalCount,
  };
}

/**
 * Connection-style pagination (Relay spec compatible)
 */
export type ConnectionInfo = {
  edges: Array<{ cursor: string; node: unknown }>;
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor: string | null;
    endCursor: string | null;
  };
  totalCount: number;
};

/**
 * Encode cursor from offset
 */
export function encodeCursor(offset: number): string {
  return Buffer.from(`cursor:${offset}`).toString("base64");
}

/**
 * Decode cursor to offset
 */
export function decodeCursor(cursor: string): number {
  try {
    const decoded = Buffer.from(cursor, "base64").toString("utf-8");
    const match = decoded.match(/^cursor:(\d+)$/);
    return match ? parseInt(match[1], 10) : 0;
  } catch {
    return 0;
  }
}

/**
 * Cursor-based pagination input
 */
export type CursorPaginationInput = {
  first?: number;
  after?: string;
  last?: number;
  before?: string;
};

/**
 * Resolve cursor-based pagination to limit/offset
 */
export function resolveCursorPagination(
  input: CursorPaginationInput | undefined | null,
  config?: PaginationConfig
): ResolvedPagination {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  if (!input) {
    return {
      limit: cfg.defaultLimit,
      offset: 0,
    };
  }

  let limit = cfg.defaultLimit;
  let offset = 0;

  if (input.first !== undefined) {
    limit = Math.min(input.first, cfg.maxLimit);
  } else if (input.last !== undefined) {
    limit = Math.min(input.last, cfg.maxLimit);
  }

  if (input.after) {
    offset = decodeCursor(input.after) + 1;
  } else if (input.before) {
    const beforeOffset = decodeCursor(input.before);
    offset = Math.max(0, beforeOffset - limit);
  }

  return { limit, offset };
}

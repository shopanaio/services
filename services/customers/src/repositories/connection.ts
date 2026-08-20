import type { PageInfo } from "@shopana/drizzle-query";
import { InvalidCursorError } from "@shopana/drizzle-query";

export const IMPOSSIBLE_UUID = "00000000-0000-0000-0000-000000000000";

export interface RepositoryConnectionResult<TNodeId = string> {
  edges: Array<{ cursor: string; nodeId: TNodeId }>;
  pageInfo: PageInfo;
  totalCount: number;
}

export interface RelayPaginationInput {
  first?: number | null;
  after?: string | null;
  last?: number | null;
  before?: string | null;
}

export function normalizeRelayPagination<TInput extends RelayPaginationInput>(
  input: TInput,
): TInput {
  const normalized = { ...input };

  if (normalized.first == null) delete normalized.first;
  if (normalized.after == null) delete normalized.after;
  if (normalized.last == null) delete normalized.last;
  if (normalized.before == null) delete normalized.before;

  if (normalized.first !== undefined && normalized.last !== undefined) {
    throw new InvalidCursorError("Cannot specify both 'first' and 'last'");
  }
  if (
    normalized.first !== undefined &&
    (!Number.isSafeInteger(normalized.first) || normalized.first < 1 || normalized.first > 100)
  ) {
    throw new InvalidCursorError("first must be between 1 and 100");
  }
  if (
    normalized.last !== undefined &&
    (!Number.isSafeInteger(normalized.last) || normalized.last < 1 || normalized.last > 100)
  ) {
    throw new InvalidCursorError("last must be between 1 and 100");
  }
  if (normalized.after !== undefined && normalized.before !== undefined) {
    throw new InvalidCursorError("Cannot specify both 'after' and 'before'");
  }
  if (normalized.after !== undefined && normalized.last !== undefined) {
    throw new InvalidCursorError("after requires forward pagination");
  }
  if (normalized.before !== undefined && normalized.first !== undefined) {
    throw new InvalidCursorError("before requires backward pagination");
  }

  if (normalized.first === undefined && normalized.last === undefined) {
    if (normalized.before !== undefined) normalized.last = 20;
    else normalized.first = 20;
  }

  return normalized;
}

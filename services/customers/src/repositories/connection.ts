import type { PageInfo } from "@shopana/drizzle-query";

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
  input: TInput
): TInput {
  const normalized = { ...input };

  if (normalized.first == null) delete normalized.first;
  if (normalized.after == null) delete normalized.after;
  if (normalized.last == null) delete normalized.last;
  if (normalized.before == null) delete normalized.before;

  if (normalized.first === undefined && normalized.last === undefined) {
    normalized.first = 20;
  }

  return normalized;
}

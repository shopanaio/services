import type { PageInfo } from "@shopana/drizzle-query";

export interface RepositoryConnectionResult {
  edges: Array<{ cursor: string; nodeId: string }>;
  pageInfo: PageInfo;
  totalCount: number;
}

export type MutationResult<T> = { status: "applied"; value: T } | { status: "not_found" };

export interface RelayPaginationInput {
  first?: number;
  after?: string;
  last?: number;
  before?: string;
}

import type { PageInfo } from "@shopana/drizzle-query";

export interface RepositoryConnectionResult {
  edges: Array<{ cursor: string; nodeId: string }>;
  pageInfo: PageInfo;
  totalCount: number;
}

export type OptimisticMutationResult<T> =
  | { status: "applied"; value: T }
  | { status: "not_found" }
  | { status: "conflict"; current: T };

export type DeleteMutationResult<T> =
  | { status: "applied"; value: T }
  | { status: "not_found" }
  | { status: "conflict"; current: T };

export interface RelayPaginationInput {
  first?: number;
  after?: string;
  last?: number;
  before?: string;
}

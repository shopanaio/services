"use client";

import type {
  DocumentNode,
  OperationVariables,
  TypedDocumentNode,
  WatchQueryFetchPolicy,
} from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import type { ApiPageInfo } from "@/graphql/types";

export interface RelayConnection<TNode> {
  edges: ReadonlyArray<{ node: TNode }>;
  pageInfo: ApiPageInfo;
  totalCount: number;
}

export interface UseRelayConnectionQueryOptions<
  TData,
  TVariables extends OperationVariables,
  TNode,
  TConnection extends RelayConnection<TNode>,
> {
  query: DocumentNode | TypedDocumentNode<TData, TVariables>;
  variables: TVariables;
  skip?: boolean;
  fetchPolicy?: WatchQueryFetchPolicy;
  getConnection: (data: TData | undefined) => TConnection | null | undefined;
}

export interface UseRelayConnectionQueryReturn<
  TNode,
  TConnection extends RelayConnection<TNode>,
> {
  nodes: TNode[];
  connection: TConnection | null;
  totalCount: number;
  pageInfo: ApiPageInfo | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

export function useRelayConnectionQuery<
  TData,
  TVariables extends OperationVariables,
  TNode,
  TConnection extends RelayConnection<TNode>,
>({
  query,
  variables,
  skip = false,
  fetchPolicy = "cache-and-network",
  getConnection,
}: UseRelayConnectionQueryOptions<
  TData,
  TVariables,
  TNode,
  TConnection
>): UseRelayConnectionQueryReturn<TNode, TConnection> {
  const { data, previousData, loading, error, refetch } = useQuery<
    TData,
    TVariables
  >(query, {
    variables,
    skip,
    fetchPolicy,
  });

  const effectiveData = (data ?? previousData) as TData | undefined;
  const connection = getConnection(effectiveData) ?? null;

  return {
    nodes: connection?.edges.map((edge) => edge.node) ?? [],
    connection,
    totalCount: connection?.totalCount ?? 0,
    pageInfo: connection?.pageInfo ?? null,
    loading,
    error: (error as Error | undefined) ?? null,
    refetch: () => refetch(),
  };
}

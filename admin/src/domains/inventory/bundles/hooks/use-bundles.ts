import type {
  ApiBundle,
  ApiBundleBundlesMetaInput,
  ApiBundleConnection,
  ApiBundleOrderByInput,
  ApiBundleWhereInput,
  ApiPageInfo,
} from "@/graphql/types";
import { useRelayConnectionQuery } from "@/graphql/hooks/use-relay-connection-query";
import type { RelayCursorPaginationVariables } from "@/ui-kit/cursor-pagination";
import { BUNDLES_QUERY } from "../graphql";
import type { BundlesQueryData, BundlesQueryVariables } from "../graphql";

export interface UseBundlesOptions extends RelayCursorPaginationVariables {
  where?: ApiBundleWhereInput | null;
  orderBy?: ApiBundleOrderByInput[] | null;
  meta?: ApiBundleBundlesMetaInput | null;
  skip?: boolean;
}

export interface UseBundlesReturn {
  bundles: ApiBundle[];
  connection: ApiBundleConnection | null;
  totalCount: number;
  pageInfo: ApiPageInfo | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

export function useBundles(
  options: UseBundlesOptions = {},
): UseBundlesReturn {
  const {
    first,
    after = null,
    last,
    before = null,
    where = null,
    orderBy = null,
    meta = null,
    skip = false,
  } = options;

  const result = useRelayConnectionQuery<
    BundlesQueryData,
    BundlesQueryVariables,
    ApiBundle,
    ApiBundleConnection
  >({
    query: BUNDLES_QUERY,
    variables: { first, after, last, before, where, orderBy, meta },
    skip,
    fetchPolicy: "cache-and-network",
    getConnection: (data) => data?.catalogQuery.bundles,
  });

  return {
    bundles: result.nodes,
    connection: result.connection,
    totalCount: result.totalCount,
    pageInfo: result.pageInfo,
    loading: result.loading,
    error: result.error,
    refetch: result.refetch,
  };
}

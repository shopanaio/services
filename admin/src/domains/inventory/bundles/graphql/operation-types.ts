import type {
  ApiBundleBundlesMetaInput,
  ApiBundleConnection,
  ApiBundleOrderByInput,
  ApiBundleWhereInput,
  ApiCatalogQuery,
} from "@/graphql/types";

export interface BundlesQueryData {
  catalogQuery: Pick<ApiCatalogQuery, "bundles"> & {
    bundles: ApiBundleConnection;
  };
}

export interface BundlesQueryVariables {
  first?: number;
  after?: string | null;
  last?: number;
  before?: string | null;
  where?: ApiBundleWhereInput | null;
  orderBy?: ApiBundleOrderByInput[] | null;
  meta?: ApiBundleBundlesMetaInput | null;
}

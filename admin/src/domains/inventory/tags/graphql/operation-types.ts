import type {
  ApiCatalogQuery,
  ApiTagConnection,
} from "@/graphql/types";

export interface TagsQueryData {
  catalogQuery: Pick<ApiCatalogQuery, "tags"> & {
    tags: ApiTagConnection;
  };
}

export interface TagsQueryVariables {
  first?: number;
  after?: string | null;
  last?: number;
  before?: string | null;
}

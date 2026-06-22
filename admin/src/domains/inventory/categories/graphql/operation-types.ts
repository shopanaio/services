import type {
  ApiCatalogQuery,
  ApiCategoryConnection,
  ApiCategoryOrderByInput,
  ApiCategoryWhereInput,
} from "@/graphql/types";

export interface CategoriesQueryData {
  catalogQuery: Pick<ApiCatalogQuery, "categories"> & {
    categories: ApiCategoryConnection;
  };
}

export interface CategoriesQueryVariables {
  first?: number;
  after?: string | null;
  last?: number;
  before?: string | null;
  where?: ApiCategoryWhereInput | null;
  orderBy?: ApiCategoryOrderByInput[] | null;
}

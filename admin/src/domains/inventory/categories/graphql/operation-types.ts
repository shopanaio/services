import type {
  ApiCatalogMutation,
  ApiCatalogQuery,
  ApiCategory,
  ApiCategoryAddProductInput,
  ApiCategoryAddProductPayload,
  ApiCategoryCreateInput,
  ApiCategoryCreatePayload,
  ApiCategoryDeleteInput,
  ApiCategoryConnection,
  ApiCategoryMoveProductInput,
  ApiCategoryMoveProductPayload,
  ApiCategoryOrderByInput,
  ApiCategoryProductConnection,
  ApiCategoryProductWhereInput,
  ApiCategoryRebalanceInput,
  ApiCategoryRebalancePayload,
  ApiCategoryRemoveProductInput,
  ApiCategoryRemoveProductPayload,
  ApiCategoryUpdateInput,
  ApiGenericUserError,
  ApiOperationResult,
  ApiProductOrderByInput,
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
  meta?: ApiCategoryCategoriesMetaInput | null;
}

export interface ApiCategoryHierarchyScopeInput {
  referenceId: string;
  direction: "ANCESTORS" | "DESCENDANTS";
  includeReference?: boolean | null;
  mode?: "INCLUDE" | "EXCLUDE" | null;
}

export interface ApiCategoryCategoriesMetaInput {
  hierarchyScope?: ApiCategoryHierarchyScopeInput | null;
}

export interface CategoryCreateMutationData {
  catalogMutation: Pick<ApiCatalogMutation, "categoryCreate"> & {
    categoryCreate: ApiCategoryCreatePayload;
  };
}

export interface CategoryCreateMutationVariables {
  input: ApiCategoryCreateInput;
}

export interface CategoryDetailsQueryData {
  catalogQuery: Pick<ApiCatalogQuery, "category"> & {
    category: ApiCategory | null;
  };
}

export interface CategoryDetailsQueryVariables {
  id: string;
}

export interface CategoryProductsQueryData {
  catalogQuery: Pick<ApiCatalogQuery, "category"> & {
    category: (Pick<ApiCategory, "id" | "products"> & {
      products: ApiCategoryProductConnection;
    }) | null;
  };
}

export interface CategoryProductsQueryVariables {
  id: string;
  first?: number;
  after?: string | null;
  last?: number;
  before?: string | null;
  where?: ApiCategoryProductWhereInput | null;
  orderBy?: ApiProductOrderByInput[] | null;
}

export interface CategoryUpdateMutationData {
  catalogMutation: Pick<ApiCatalogMutation, "categoryUpdate"> & {
    categoryUpdate: {
      category: ApiCategory | null;
      operationResults: ApiOperationResult[];
      userErrors: ApiGenericUserError[];
    };
  };
}

export interface CategoryUpdateMutationVariables {
  categoryId: string;
  expectedRevision?: number | null;
  operations?: ApiCategoryUpdateInput | null;
}

export interface CategoryDeleteMutationData {
  catalogMutation: Pick<ApiCatalogMutation, "categoryDelete"> & {
    categoryDelete: {
      deletedCategoryId: string | null;
      userErrors: ApiGenericUserError[];
    };
  };
}

export interface CategoryDeleteMutationVariables {
  input: ApiCategoryDeleteInput;
}

export interface CategoryAddProductMutationData {
  catalogMutation: Pick<ApiCatalogMutation, "categoryAddProduct"> & {
    categoryAddProduct: ApiCategoryAddProductPayload;
  };
}

export interface CategoryAddProductMutationVariables {
  input: ApiCategoryAddProductInput;
}

export interface CategoryRemoveProductMutationData {
  catalogMutation: Pick<ApiCatalogMutation, "categoryRemoveProduct"> & {
    categoryRemoveProduct: ApiCategoryRemoveProductPayload;
  };
}

export interface CategoryRemoveProductMutationVariables {
  input: ApiCategoryRemoveProductInput;
}

export interface CategoryMoveProductMutationData {
  catalogMutation: Pick<ApiCatalogMutation, "categoryMoveProduct"> & {
    categoryMoveProduct: ApiCategoryMoveProductPayload;
  };
}

export interface CategoryMoveProductMutationVariables {
  input: ApiCategoryMoveProductInput;
}

export interface CategoryRebalanceMutationData {
  catalogMutation: Pick<ApiCatalogMutation, "categoryRebalance"> & {
    categoryRebalance: ApiCategoryRebalancePayload;
  };
}

export interface CategoryRebalanceMutationVariables {
  input: ApiCategoryRebalanceInput;
}

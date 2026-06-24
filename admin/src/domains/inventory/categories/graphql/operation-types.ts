import type {
  ApiCatalogMutation,
  ApiCatalogQuery,
  ApiCategory,
  ApiCategoryCategoriesMetaInput,
  ApiCategoryCreateInput,
  ApiCategoryCreatePayload,
  ApiCategoryDeleteInput,
  ApiCategoryConnection,
  ApiCategoryOrderByInput,
  ApiCategoryProductConnection,
  ApiCategoryProductWhereInput,
  ApiCategoryRebalanceInput,
  ApiCategoryRebalancePayload,
  ApiCategoryUpdateInput,
  ApiGenericUserError,
  ApiListingOrderByInput,
  ApiOperationResult,
  ApiProduct,
  ApiProductCategoryOperationInput,
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
  orderBy?: ApiListingOrderByInput[] | null;
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

export interface ProductCategoryUpdateMutationData {
  catalogMutation: Pick<ApiCatalogMutation, "productUpdate"> & {
    productUpdate: {
      product: (
        Pick<
          ApiProduct,
          "id" | "updatedAt" | "revision" | "primaryCategory" | "categoryAssignments"
        >
      ) | null;
      operationResults: ApiOperationResult[];
      userErrors: ApiGenericUserError[];
    };
  };
}

export interface ProductCategoryUpdateMutationVariables {
  productId: string;
  categories: ApiProductCategoryOperationInput[];
}

export interface CategoryRebalanceMutationData {
  catalogMutation: Pick<ApiCatalogMutation, "categoryRebalance"> & {
    categoryRebalance: ApiCategoryRebalancePayload;
  };
}

export interface CategoryRebalanceMutationVariables {
  input: ApiCategoryRebalanceInput;
}

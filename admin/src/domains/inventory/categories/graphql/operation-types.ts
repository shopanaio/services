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
  ApiCategoryRebalanceInput,
  ApiCategoryRebalancePayload,
  ApiCategoryUpdateInput,
  ApiGenericUserError,
  ApiListingConnection,
  ApiListingOrderByInput,
  ApiOperationResult,
  ApiProduct,
  ApiProductCategoryOperationInput,
  ApiCategoryWhereInput,
  ApiListingFacet,
  ApiListingProductFilter,
  ApiProductMediaItem,
  ApiProductConnection,
  ApiProductOrderByInput,
  ApiProductPriceRange,
  ApiProductWhereInput,
} from "@/graphql/types";

export type CategoryProductsOrderByInput = ApiProductOrderByInput;

export type CategoryProductsWhereInput = ApiProductWhereInput;

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
  catalogQuery: Pick<ApiCatalogQuery, "products"> & {
    products: Pick<ApiProductConnection, "pageInfo" | "totalCount"> & {
      edges: Array<{
        cursor: string;
        node: CategoryProductListItem;
      }>;
    };
  };
}

export type CategoryProductListItem = Pick<
  ApiProduct,
  "id" | "isPublished" | "title" | "handle"
> & {
  media: Array<
    Pick<ApiProductMediaItem, "sortIndex"> & {
      file: Pick<ApiProductMediaItem["file"], "id" | "url" | "altText">;
    }
  >;
};

export interface CategoryProductsQueryVariables {
  categoryId: string;
  first?: number;
  after?: string | null;
  last?: number;
  before?: string | null;
  where?: CategoryProductsWhereInput | null;
  orderBy?: CategoryProductsOrderByInput[] | null;
}

export type CategoryListingPreviewItem = Pick<
  ApiProduct,
  "id" | "title" | "handle" | "isPublished"
> & {
  __typename?: "Product";
  media: Array<
    Pick<ApiProductMediaItem, "sortIndex"> & {
      file: Pick<ApiProductMediaItem["file"], "id" | "url" | "altText">;
    }
  >;
  priceRange?: Pick<
    ApiProductPriceRange,
    "minPriceAmount" | "maxPriceAmount" | "currency"
  > | null;
};

export interface CategoryListingPreviewQueryData {
  listingQuery: {
    listing: Pick<ApiListingConnection, "pageInfo" | "totalCount"> & {
      edges: Array<{
        cursor: string;
        node: CategoryListingPreviewItem;
      }>;
      facets: ApiListingFacet[];
    };
  };
}

export interface CategoryListingPreviewQueryVariables {
  categoryId: string;
  first?: number;
  after?: string | null;
  query?: string | null;
  locale?: string | null;
  currency?: string | null;
  facets?: ApiListingProductFilter[] | null;
  orderBy?: ApiListingOrderByInput | null;
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

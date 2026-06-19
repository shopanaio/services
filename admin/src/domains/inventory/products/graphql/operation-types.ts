import type {
  ApiCatalogMutation,
  ApiCatalogQuery,
  ApiGenericUserError,
  ApiOperationResult,
  ApiPricingWidgetInput,
  ApiPricingWidgetPayload,
  ApiProduct,
  ApiProductConnection,
  ApiProductCreateInput,
  ApiProductDeleteInput,
  ApiProductUpdateInput,
  ApiProductUpdateStatusInput,
  ApiVariantConnection,
  ApiWidgetQuery,
} from "@/graphql/types";

export interface ProductsQueryData {
  catalogQuery: Pick<ApiCatalogQuery, "products"> & {
    products: ApiProductConnection;
  };
}

export interface ProductsQueryVariables {
  first?: number;
  after?: string | null;
  last?: number;
  before?: string | null;
}

export interface ProductDetailsQueryData {
  catalogQuery: Pick<ApiCatalogQuery, "product"> & {
    product: ApiProduct | null;
  };
}

export interface ProductDetailsQueryVariables {
  id: string;
  variantsFirst?: number;
  variantsAfter?: string | null;
}

export interface ProductVariantsQueryData {
  catalogQuery: Pick<ApiCatalogQuery, "product"> & {
    product: (Pick<ApiProduct, "id" | "variants"> & {
      variants: ApiVariantConnection;
    }) | null;
  };
}

export interface ProductVariantsQueryVariables {
  id: string;
  first?: number;
  after?: string | null;
}

export interface ProductPricingWidgetQueryData {
  widgetQuery: Pick<ApiWidgetQuery, "pricing"> & {
    pricing: ApiPricingWidgetPayload;
  };
}

export interface ProductPricingWidgetQueryVariables {
  input: ApiPricingWidgetInput;
}

export interface ProductCreateMutationData {
  catalogMutation: Pick<ApiCatalogMutation, "productCreate"> & {
    productCreate: {
      product: ApiProduct | null;
      userErrors: ApiGenericUserError[];
    };
  };
}

export interface ProductCreateMutationVariables {
  input: ApiProductCreateInput;
}

export interface ProductUpdateMutationData {
  catalogMutation: Pick<ApiCatalogMutation, "productUpdate"> & {
    productUpdate: {
      product: ApiProduct | null;
      operationResults: ApiOperationResult[];
      userErrors: ApiGenericUserError[];
    };
  };
}

export interface ProductUpdateMutationVariables {
  productId: string;
  operations?: ApiProductUpdateInput | null;
  expectedRevision?: number | null;
}

export interface ProductDeleteMutationData {
  catalogMutation: Pick<ApiCatalogMutation, "productDelete"> & {
    productDelete: {
      deletedProductId: string | null;
      userErrors: ApiGenericUserError[];
    };
  };
}

export interface ProductDeleteMutationVariables {
  input: ApiProductDeleteInput;
}

export interface ProductUpdateStatusMutationData {
  catalogMutation: Pick<ApiCatalogMutation, "productUpdateStatus"> & {
    productUpdateStatus: {
      product: ApiProduct | null;
      userErrors: ApiGenericUserError[];
    };
  };
}

export interface ProductUpdateStatusMutationVariables {
  input: ApiProductUpdateStatusInput;
}

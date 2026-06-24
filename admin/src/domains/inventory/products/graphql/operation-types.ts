import type {
  ApiCatalogMutation,
  ApiCatalogQuery,
  ApiGenericUserError,
  ApiInventoryItem,
  ApiInventoryItemUpdateInput,
  ApiInventoryMutation,
  ApiInventoryQuery,
  ApiOperationResult,
  ApiPricingWidgetInput,
  ApiPricingWidgetPayload,
  ApiProduct,
  ApiProductConnection,
  ApiProductCreateInput,
  ApiProductDeleteInput,
  ApiProductFeature,
  ApiProductFeaturesSyncInput,
  ApiProductInventoryWidget,
  ApiProductOption,
  ApiProductOptionsSyncInput,
  ApiProductOrderByInput,
  ApiProductProductsMetaInput,
  ApiProductUpdateInput,
  ApiProductUpdateStatusInput,
  ApiProductWhereInput,
  ApiVendorConnection,
  ApiVendorOrderByInput,
  ApiVendorWhereInput,
  ApiVariantConnection,
  ApiWarehouseConnection,
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
  where?: ApiProductWhereInput | null;
  orderBy?: ApiProductOrderByInput[] | null;
  meta?: ApiProductProductsMetaInput | null;
}

export interface VendorsQueryData {
  catalogQuery: Pick<ApiCatalogQuery, "vendors"> & {
    vendors: ApiVendorConnection;
  };
}

export interface VendorsQueryVariables {
  first?: number;
  after?: string | null;
  last?: number;
  before?: string | null;
  where?: ApiVendorWhereInput | null;
  orderBy?: ApiVendorOrderByInput[] | null;
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

export interface ProductInventoryWidgetQueryData {
  widgetQuery: Pick<ApiWidgetQuery, "inventory"> & {
    inventory: ApiProductInventoryWidget | null;
  };
}

export interface ProductInventoryWidgetQueryVariables {
  productId: string;
}

export interface InventoryDefaultWarehouseQueryData {
  inventoryQuery: Pick<ApiInventoryQuery, "warehouses"> & {
    warehouses: ApiWarehouseConnection;
  };
}

export type InventoryDefaultWarehouseQueryVariables = Record<string, never>;

export interface InventoryItemByVariantQueryData {
  inventoryQuery: Pick<ApiInventoryQuery, "inventoryItemByVariant"> & {
    inventoryItemByVariant: ApiInventoryItem | null;
  };
}

export interface InventoryItemByVariantQueryVariables {
  variantId: string;
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

export type ProductFeaturesSyncProduct = Pick<ApiProduct, "id" | "features"> & {
  features: ApiProductFeature[];
};

export interface ProductFeaturesSyncPayloadData {
  product: ProductFeaturesSyncProduct | null;
  features: ApiProductFeature[];
  userErrors: ApiGenericUserError[];
}

export interface ProductFeaturesSyncMutationData {
  catalogMutation: Pick<ApiCatalogMutation, "productFeaturesSync"> & {
    productFeaturesSync: ProductFeaturesSyncPayloadData;
  };
}

export interface ProductFeaturesSyncMutationVariables {
  input: ApiProductFeaturesSyncInput;
}

export type ProductOptionsSyncProduct = Pick<ApiProduct, "id" | "options"> & {
  options: ApiProductOption[];
};

export interface ProductOptionsSyncPayloadData {
  product: ProductOptionsSyncProduct | null;
  options: ApiProductOption[];
  userErrors: ApiGenericUserError[];
}

export interface ProductOptionsSyncMutationData {
  catalogMutation: Pick<ApiCatalogMutation, "productOptionsSync"> & {
    productOptionsSync: ProductOptionsSyncPayloadData;
  };
}

export interface ProductOptionsSyncMutationVariables {
  input: ApiProductOptionsSyncInput;
}

export interface InventoryItemUpdateMutationData {
  inventoryMutation: Pick<ApiInventoryMutation, "inventoryItemUpdate"> & {
    inventoryItemUpdate: {
      inventoryItem: ApiInventoryItem | null;
      userErrors: ApiGenericUserError[];
    };
  };
}

export interface InventoryItemUpdateMutationVariables {
  input: ApiInventoryItemUpdateInput;
}

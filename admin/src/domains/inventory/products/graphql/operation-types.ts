import type {
  ApiCatalogMutation,
  ApiCatalogQuery,
  ApiGenericUserError,
  ApiInventoryItem,
  ApiInventoryQuery,
  ApiOperationResult,
  ApiPricingWidgetInput,
  ApiPricingWidgetPayload,
  ApiProduct,
  ApiProductConnection,
  ApiProductComponentConfigurationCreateInput,
  ApiProductComponentConfigurationDeleteInput,
  ApiProductComponentConfigurationDeletePayload,
  ApiProductComponentConfigurationPayload,
  ApiProductComponentConfigurationUpdateInput,
  ApiProductComponentDependencyRulesSyncInput,
  ApiProductComponentDependencyRulesSyncPayload,
  ApiProductCreateInput,
  ApiProductDeleteInput,
  ApiProductFeature,
  ApiProductInventoryWidget,
  ApiProductOption,
  ApiProductOrderByInput,
  ApiProductProductsMetaInput,
  ApiProductUpdateInput,
  ApiProductWhereInput,
  ApiVendorConnection,
  ApiVendorOrderByInput,
  ApiVendorWhereInput,
  ApiVariantConnection,
  ApiVariantOrderByInput,
  ApiVariantWhereInput,
  ApiWarehouseAssignableVariantOrderByInput,
  ApiWarehouseAssignableVariantWhereInput,
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

export interface VariantsQueryData {
  catalogQuery: Pick<ApiCatalogQuery, "variants"> & {
    variants: ApiVariantConnection;
  };
}

export interface VariantsQueryVariables {
  first?: number;
  after?: string | null;
  last?: number;
  before?: string | null;
  where?: ApiVariantWhereInput | null;
  orderBy?: ApiVariantOrderByInput[] | null;
}

export interface WarehouseAssignableVariantsQueryData {
  inventoryQuery: Pick<ApiInventoryQuery, "warehouseAssignableVariants"> & {
    warehouseAssignableVariants: ApiVariantConnection;
  };
}

export interface WarehouseAssignableVariantsQueryVariables {
  warehouseId: string;
  first?: number;
  after?: string | null;
  last?: number;
  before?: string | null;
  where?: ApiWarehouseAssignableVariantWhereInput | null;
  orderBy?: ApiWarehouseAssignableVariantOrderByInput[] | null;
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

export interface ProductComponentConfigurationCreateMutationData {
  catalogMutation: Pick<
    ApiCatalogMutation,
    "productComponentConfigurationCreate"
  > & {
    productComponentConfigurationCreate: ApiProductComponentConfigurationPayload;
  };
}

export interface ProductComponentConfigurationCreateMutationVariables {
  input: ApiProductComponentConfigurationCreateInput;
}

export interface ProductComponentConfigurationUpdateMutationData {
  catalogMutation: Pick<
    ApiCatalogMutation,
    "productComponentConfigurationUpdate"
  > & {
    productComponentConfigurationUpdate: ApiProductComponentConfigurationPayload;
  };
}

export interface ProductComponentConfigurationUpdateMutationVariables {
  input: ApiProductComponentConfigurationUpdateInput;
}

export interface ProductComponentConfigurationDeleteMutationData {
  catalogMutation: Pick<
    ApiCatalogMutation,
    "productComponentConfigurationDelete"
  > & {
    productComponentConfigurationDelete: ApiProductComponentConfigurationDeletePayload;
  };
}

export interface ProductComponentConfigurationDeleteMutationVariables {
  input: ApiProductComponentConfigurationDeleteInput;
}

export interface ProductComponentDependencyRulesSyncMutationData {
  catalogMutation: Pick<
    ApiCatalogMutation,
    "productComponentDependencyRulesSync"
  > & {
    productComponentDependencyRulesSync: ApiProductComponentDependencyRulesSyncPayload;
  };
}

export interface ProductComponentDependencyRulesSyncMutationVariables {
  input: ApiProductComponentDependencyRulesSyncInput;
}

export type ProductFeaturesSyncProduct = Pick<ApiProduct, "id" | "features"> & {
  features: ApiProductFeature[];
};

export type ProductOptionsSyncProduct = Pick<ApiProduct, "id" | "options"> & {
  options: ApiProductOption[];
};

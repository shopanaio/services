import {
  CurrencyCode,
  DimensionUnit,
  FileProvider,
  OptionDisplayType,
  ProductSortBy,
  SortDirection,
  SwatchType,
  WeightUnit,
  type ApiCategory,
  type ApiCategoryConnection,
  type ApiCategoryProductConnection,
  type ApiFile,
  type ApiInventoryItem,
  type ApiInventoryItemCost,
  type ApiInventoryItemDimensions,
  type ApiInventoryItemWeight,
  type ApiPageInfo,
  type ApiProduct,
  type ApiProductConnection,
  type ApiProductFeature,
  type ApiProductFeatureValue,
  type ApiProductMediaItem,
  type ApiProductOption,
  type ApiProductOptionSwatch,
  type ApiProductOptionValue,
  type ApiProductSeo,
  type ApiRichText,
  type ApiSelectedOption,
  type ApiTag,
  type ApiTagConnection,
  type ApiVariant,
  type ApiVariantConnection,
  type ApiVariantMediaItem,
  type ApiVariantPrice,
  type ApiVariantPriceConnection,
  type ApiWarehouse,
  type ApiWarehouseStock,
} from "@/graphql/types";

const MOCK_NOW = "2024-12-20T12:00:00.000Z";

export const createMockPageInfo = (
  overrides: Partial<ApiPageInfo> = {},
): ApiPageInfo => ({
  __typename: "PageInfo",
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: null,
  endCursor: null,
  ...overrides,
});

export const createMockApiRichText = (params: {
  json: Record<string, unknown>;
  text: string;
  html: string;
}): ApiRichText => ({
  __typename: "RichText",
  json: params.json,
  text: params.text,
  html: params.html,
});

export const createMockApiFile = (params: {
  id: string;
  name: string;
  seed?: string;
  altText?: string | null;
  url?: string;
  width?: number;
  height?: number;
  createdAt?: string;
  updatedAt?: string;
}): ApiFile => ({
  __typename: "File",
  id: params.id,
  url:
    params.url ??
    `https://picsum.photos/seed/${params.seed ?? params.id}/800/800`,
  originalName: params.name,
  altText: params.altText ?? null,
  ext: "jpg",
  mimeType: "image/jpeg",
  sizeBytes: 102400,
  provider: FileProvider.S3,
  isProcessed: true,
  createdAt: params.createdAt ?? MOCK_NOW,
  updatedAt: params.updatedAt ?? MOCK_NOW,
  deletedAt: null,
  deletionState: "ACTIVE",
  dimensions: {
    __typename: "MediaDimensions",
    width: params.width ?? 800,
    height: params.height ?? 800,
  },
  durationMs: null,
  externalData: null,
  meta: null,
  s3Data: null,
  sourceUrl: null,
  usage: {
    __typename: "FileUsageSummary",
    totalCount: 0,
    byEntity: [],
    fileActive: true,
  },
});

export const createMockApiProductOptionSwatch = (params: {
  id: string;
  colorOne?: string | null;
  colorTwo?: string | null;
  file?: ApiFile | null;
  swatchType?: SwatchType;
}): ApiProductOptionSwatch => ({
  __typename: "ProductOptionSwatch",
  id: params.id,
  colorOne: params.colorOne ?? null,
  colorTwo: params.colorTwo ?? null,
  file: params.file ?? null,
  metadata: null,
  swatchType:
    params.swatchType ??
    (params.colorTwo ? SwatchType.Gradient : SwatchType.Color),
});

export const createMockApiProductOptionValue = (params: {
  id: string;
  name: string;
  slug: string;
  sortIndex?: number;
  swatch?: ApiProductOptionSwatch | null;
}): ApiProductOptionValue => ({
  __typename: "ProductOptionValue",
  id: params.id,
  name: params.name,
  slug: params.slug,
  sortIndex: params.sortIndex ?? 0,
  swatch: params.swatch ?? null,
});

export const createMockApiProductOption = (params: {
  id: string;
  name: string;
  slug: string;
  displayType?: OptionDisplayType;
  sortIndex?: number;
  values: ApiProductOptionValue[];
}): ApiProductOption => ({
  __typename: "ProductOption",
  id: params.id,
  name: params.name,
  slug: params.slug,
  displayType: params.displayType ?? OptionDisplayType.Buttons,
  sortIndex: params.sortIndex ?? 0,
  values: params.values,
});

export const createMockApiVariantMediaItem = (params: {
  file: ApiFile;
  sortIndex?: number;
}): ApiVariantMediaItem => ({
  __typename: "VariantMediaItem",
  file: params.file,
  sortIndex: params.sortIndex ?? 0,
});

export const createMockApiProductMediaItem = (params: {
  file: ApiFile;
  sortIndex?: number;
}): ApiProductMediaItem => ({
  __typename: "ProductMediaItem",
  file: params.file,
  sortIndex: params.sortIndex ?? 0,
});

export const createMockApiVariantPrice = (params: {
  id: string;
  amountMinor: number;
  compareAtMinor?: number | null;
  currency?: CurrencyCode;
  effectiveFrom?: string;
  recordedAt?: string;
}): ApiVariantPrice => ({
  __typename: "VariantPrice",
  id: params.id,
  amountMinor: params.amountMinor,
  compareAtMinor: params.compareAtMinor ?? null,
  currency: params.currency ?? CurrencyCode.Rub,
  effectiveFrom: params.effectiveFrom ?? MOCK_NOW,
  effectiveTo: null,
  isCurrent: true,
  recordedAt: params.recordedAt ?? MOCK_NOW,
});

export const createMockApiInventoryItemCost = (params: {
  amountMinor: number;
  currency?: string;
  effectiveFrom?: string;
}): ApiInventoryItemCost => ({
  __typename: "InventoryItemCost",
  amountMinor: params.amountMinor,
  currency: params.currency ?? CurrencyCode.Rub,
  effectiveFrom: params.effectiveFrom ?? MOCK_NOW,
});

export const createMockApiInventoryItemWeight = (params: {
  weightGrams: number;
  displayUnit?: WeightUnit;
}): ApiInventoryItemWeight => ({
  __typename: "InventoryItemWeight",
  weightGrams: params.weightGrams,
  displayUnit: params.displayUnit ?? WeightUnit.G,
});

export const createMockApiInventoryItemDimensions = (params: {
  lengthMm: number;
  widthMm: number;
  heightMm: number;
  displayUnit?: DimensionUnit;
}): ApiInventoryItemDimensions => ({
  __typename: "InventoryItemDimensions",
  lengthMm: params.lengthMm,
  widthMm: params.widthMm,
  heightMm: params.heightMm,
  displayUnit: params.displayUnit ?? DimensionUnit.Mm,
});

const createMockWarehouseStockConnection = (): ApiWarehouseStock["warehouse"]["stock"] => ({
  __typename: "WarehouseStockConnection",
  edges: [],
  pageInfo: createMockPageInfo(),
  totalCount: 0,
});

export const createMockApiWarehouse = (params: {
  id?: string;
  code?: string;
  name?: string;
  variantsCount?: number;
} = {}): ApiWarehouse => ({
  __typename: "Warehouse",
  id: params.id ?? "warehouse-main",
  code: params.code ?? "WH-MAIN",
  name: params.name ?? "Main Warehouse",
  isDefault: true,
  variantsCount: params.variantsCount ?? 0,
  stock: createMockWarehouseStockConnection(),
  createdAt: MOCK_NOW,
  updatedAt: MOCK_NOW,
});

export const createMockApiWarehouseStock = (params: {
  id: string;
  quantityOnHand: number;
  reservedQuantity?: number;
  unavailableQuantity?: number;
  availableForSale?: number;
  variantId?: string;
  warehouseId?: string;
  variant?: ApiVariant;
  warehouse?: ApiWarehouse;
}): ApiWarehouseStock => {
  const variant = params.variant ?? ({} as ApiVariant);
  const warehouse = params.warehouse ?? createMockApiWarehouse();
  const reservedQuantity = params.reservedQuantity ?? 0;
  const unavailableQuantity = params.unavailableQuantity ?? 0;

  return {
    __typename: "WarehouseStock",
    id: params.id,
    warehouseId: params.warehouseId ?? warehouse.id,
    variantId: params.variantId ?? variant.id ?? "variant-main",
    quantityOnHand: params.quantityOnHand,
    reservedQuantity,
    unavailableQuantity,
    availableForSale:
      params.availableForSale ??
      params.quantityOnHand - reservedQuantity - unavailableQuantity,
    variant,
    warehouse,
    createdAt: MOCK_NOW,
    updatedAt: MOCK_NOW,
  };
};

export const createMockApiInventoryItem = (params: {
  id: string;
  variantId: string;
  sku?: string | null;
  stock?: ApiWarehouseStock[];
  totalAvailable?: number;
  weight?: ApiInventoryItemWeight | null;
  dimensions?: ApiInventoryItemDimensions | null;
  unitCost?: ApiInventoryItemCost | null;
  trackInventory?: boolean;
  continueSellingWhenOutOfStock?: boolean;
}): ApiInventoryItem => ({
  __typename: "InventoryItem",
  id: params.id,
  variantId: params.variantId,
  sku: params.sku ?? null,
  stock: params.stock ?? [],
  totalAvailable: params.totalAvailable ?? 0,
  weight: params.weight ?? null,
  dimensions: params.dimensions ?? null,
  unitCost: params.unitCost ?? null,
  trackInventory: params.trackInventory ?? true,
  continueSellingWhenOutOfStock:
    params.continueSellingWhenOutOfStock ?? false,
  createdAt: MOCK_NOW,
  updatedAt: MOCK_NOW,
});

export const createEmptyVariantPriceConnection =
  (): ApiVariant["priceHistory"] => ({
    __typename: "VariantPriceConnection",
    edges: [],
    pageInfo: createMockPageInfo(),
    totalCount: 0,
  });

export const createMockApiVariant = (params: {
  id: string;
  handle: string;
  title?: string | null;
  isDefault?: boolean;
  price?: ApiVariantPrice | null;
  inventoryItem?: ApiInventoryItem | null;
  media?: ApiVariantMediaItem[];
  selectedOptions?: ApiSelectedOption[];
  product?: ApiProduct;
  priceHistory?: ApiVariantPriceConnection;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}): ApiVariant => ({
  __typename: "Variant",
  id: params.id,
  handle: params.handle,
  title: params.title ?? null,
  isDefault: params.isDefault ?? false,
  price: params.price ?? null,
  inventoryItem: params.inventoryItem ?? null,
  media: params.media ?? [],
  selectedOptions: params.selectedOptions ?? [],
  product: params.product ?? ({} as ApiProduct),
  createdAt: params.createdAt ?? MOCK_NOW,
  updatedAt: params.updatedAt ?? MOCK_NOW,
  deletedAt: params.deletedAt ?? null,
  externalId: null,
  externalSystem: null,
  priceHistory: params.priceHistory ?? createEmptyVariantPriceConnection(),
});

export const createMockApiVariantConnection = (
  variants: ApiVariant[],
  pageInfo: ApiPageInfo = createMockPageInfo({
    startCursor: variants.length ? "variant-cursor-0" : null,
    endCursor: variants.length ? `variant-cursor-${variants.length - 1}` : null,
  }),
  totalCount = variants.length,
): ApiVariantConnection => ({
  __typename: "VariantConnection",
  edges: variants.map((variant, index) => ({
    __typename: "VariantEdge",
    cursor: `variant-cursor-${index}`,
    node: variant,
  })),
  pageInfo,
  totalCount,
});

export const createMockApiCategoryProductConnection =
  (): ApiCategoryProductConnection => ({
    __typename: "CategoryProductConnection",
    edges: [],
    pageInfo: createMockPageInfo(),
    totalCount: 0,
  });

export const createMockApiCategory = (params: {
  id: string;
  name: string;
  handle: string;
  description?: ApiRichText | null;
  excerpt?: ApiRichText | null;
  media?: ApiCategory["media"];
  isPublished?: boolean;
  parent?: ApiCategory | null;
  children?: ApiCategory[];
  ancestors?: ApiCategory[];
  productsCount?: number;
  revision?: number;
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string | null;
}): ApiCategory => ({
  __typename: "Category",
  id: params.id,
  name: params.name,
  handle: params.handle,
  description: params.description ?? null,
  excerpt: params.excerpt ?? null,
  media: params.media ?? [],
  isPublished: params.isPublished ?? true,
  parent: params.parent ?? null,
  children: params.children ?? [],
  ancestors: params.ancestors ?? [],
  productsCount: params.productsCount ?? 0,
  products: createMockApiCategoryProductConnection(),
  path: params.parent ? `${params.parent.path}/${params.handle}` : params.handle,
  depth: params.parent ? params.parent.depth + 1 : 0,
  defaultSort: ProductSortBy.Manual,
  defaultSortDirection: SortDirection.Asc,
  revision: params.revision ?? 1,
  seo: null,
  publishedAt: params.publishedAt ?? MOCK_NOW,
  deletedAt: null,
  createdAt: params.createdAt ?? MOCK_NOW,
  updatedAt: params.updatedAt ?? MOCK_NOW,
});

export const createMockApiCategoryConnection = (
  categories: ApiCategory[],
): ApiCategoryConnection => ({
  __typename: "CategoryConnection",
  edges: categories.map((category, index) => ({
    __typename: "CategoryEdge",
    cursor: `category-cursor-${index}`,
    node: category,
  })),
  pageInfo: createMockPageInfo({
    startCursor: categories.length ? "category-cursor-0" : null,
    endCursor: categories.length
      ? `category-cursor-${categories.length - 1}`
      : null,
  }),
  totalCount: categories.length,
});

export const createMockApiTag = (params: {
  id: string;
  name: string;
  handle: string;
  productsCount?: number;
  createdAt?: string;
}): ApiTag => ({
  __typename: "Tag",
  id: params.id,
  name: params.name,
  handle: params.handle,
  productsCount: params.productsCount ?? 0,
  products: createMockApiProductConnection([]),
  createdAt: params.createdAt ?? MOCK_NOW,
});

export const createMockApiTagConnection = (tags: ApiTag[]): ApiTagConnection => ({
  __typename: "TagConnection",
  edges: tags.map((tag, index) => ({
    __typename: "TagEdge",
    cursor: `tag-cursor-${index}`,
    node: tag,
  })),
  pageInfo: createMockPageInfo({
    startCursor: tags.length ? "tag-cursor-0" : null,
    endCursor: tags.length ? `tag-cursor-${tags.length - 1}` : null,
  }),
  totalCount: tags.length,
});

export const createMockApiProductFeatureValue = (params: {
  id: string;
  name: string;
  slug: string;
  index?: number;
}): ApiProductFeatureValue => ({
  __typename: "ProductFeatureValue",
  id: params.id,
  name: params.name,
  slug: params.slug,
  index: params.index ?? 0,
});

export const createMockApiProductFeature = (params: {
  id: string;
  name: string;
  slug: string;
  values?: ApiProductFeatureValue[];
  index?: number[];
  isGroup?: boolean;
  children?: ApiProductFeature[];
  parent?: ApiProductFeature | null;
}): ApiProductFeature => ({
  __typename: "ProductFeature",
  id: params.id,
  name: params.name,
  slug: params.slug,
  index: params.index ?? [0],
  isGroup: params.isGroup ?? false,
  children: params.children ?? [],
  parent: params.parent ?? null,
  values: params.values ?? [],
});

export const createMockApiProduct = (params: {
  id: string;
  title: string;
  handle?: string | null;
  isPublished: boolean;
  description?: ApiRichText | null;
  excerpt?: ApiRichText | null;
  seo?: ApiProductSeo | null;
  variants: ApiVariant[];
  media?: ApiProductMediaItem[];
  options: ApiProductOption[];
  categories?: ApiCategory[];
  tags?: ApiTag[];
  features?: ApiProductFeature[];
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string | null;
  deletedAt?: string | null;
  revision?: number;
}): ApiProduct => {
  const product: ApiProduct = {
    __typename: "Product",
    id: params.id,
    title: params.title,
    handle: params.handle ?? null,
    isPublished: params.isPublished,
    publishedAt: params.publishedAt ?? (params.isPublished ? MOCK_NOW : null),
    description: params.description ?? null,
    excerpt: params.excerpt ?? null,
    seo: params.seo ?? null,
    createdAt: params.createdAt ?? MOCK_NOW,
    updatedAt: params.updatedAt ?? MOCK_NOW,
    deletedAt: params.deletedAt ?? null,
    revision: params.revision ?? 1,
    features: params.features ?? [],
    categoryAssignments: (params.categories ?? []).map((category, index) => ({
      __typename: "ProductCategoryAssignment",
      category,
      isPrimary: index === 0,
    })),
    primaryCategory: params.categories?.[0] ?? null,
    tags: params.tags ?? [],
    media: params.media ?? [],
    options: params.options,
    variants: createMockApiVariantConnection(params.variants),
    variantsCount: params.variants.length,
  };

  product.variants.edges.forEach((edge) => {
    edge.node.product = product;
    edge.node.inventoryItem?.stock.forEach((stock) => {
      stock.variant = edge.node;
    });
  });

  return product;
};

export const createMockApiProductConnection = (
  products: ApiProduct[],
  pageInfo: ApiPageInfo = createMockPageInfo({
    startCursor: products.length ? "product-cursor-0" : null,
    endCursor: products.length ? `product-cursor-${products.length - 1}` : null,
  }),
  totalCount = products.length,
): ApiProductConnection => ({
  __typename: "ProductConnection",
  edges: products.map((product, index) => ({
    __typename: "ProductEdge",
    cursor: `product-cursor-${index}`,
    node: product,
  })),
  pageInfo,
  totalCount,
});

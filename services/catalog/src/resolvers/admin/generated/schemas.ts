import { z } from 'zod'
import { BooleanFilter, BulkUpdateCancelReason, BulkUpdateItemStatus, BulkUpdateJobStatus, BulkUpdateOpType, CategoryCategoriesMetaInput, CategoryContentInput, CategoryCreateInput, CategoryDeleteInput, CategoryHierarchyInput, CategoryHierarchyScopeDirection, CategoryHierarchyScopeInput, CategoryHierarchyScopeMode, CategoryMediaInput, CategoryMoveInput, CategoryOrderByInput, CategoryOrderField, CategoryProductWhereInput, CategoryProductsScopeInput, CategoryRebalanceInput, CategorySortInput, CategoryStatus, CategoryUpdateInput, CategoryWhereInput, CollectionAddProductsInput, CollectionCreateInput, CollectionDeleteInput, CollectionMediaInput, CollectionMoveProductInput, CollectionRemoveProductsInput, CollectionRuleInput, CollectionType, CollectionUpdateInput, CollectionUpdateRulesInput, CurrencyCode, DateTimeFilter, DimensionUnit, DimensionsInput, FacetCreateInput, FacetDeleteInput, FacetGroupCreateInput, FacetGroupDeleteInput, FacetGroupUpdateInput, FacetSelectionMode, FacetSwatchCreateInput, FacetSwatchDeleteInput, FacetSwatchUpdateInput, FacetType, FacetUiType, FacetUpdateInput, FacetValueCreateInput, FacetValueDeleteInput, FacetValueSort, FacetValueUpdateInput, FloatFilter, IdFilter, IntFilter, InventoryItemCostInput, InventoryItemInput, InventoryItemInventoryItemsMetaInput, InventoryItemOrderByInput, InventoryItemOrderField, InventoryItemStockInput, InventoryItemUpdateInput, InventoryItemWarehouseScopeInput, InventoryItemWarehouseScopeMode, InventoryItemWhereInput, ListingOrderByInput, LocaleCode, OperationType, OptionDisplayType, PricingWidgetInput, ProductBulkUpdateInput, ProductBulkUpdateItem, ProductCategoriesScopeInput, ProductCategoryOperationAction, ProductCategoryOperationInput, ProductContentInput, ProductCreateInput, ProductCreateOptionInput, ProductCreateOptionValueInput, ProductCreateVariantInput, ProductDeleteInput, ProductFeatureCreateInput, ProductFeatureDeleteInput, ProductFeatureInput, ProductFeatureSyncItemInput, ProductFeatureUpdateInput, ProductFeatureValueCreateInput, ProductFeatureValueSyncInput, ProductFeatureValueUpdateInput, ProductFeatureValuesInput, ProductFeaturesSyncInput, ProductMediaInput, ProductOptionCreateInput, ProductOptionDeleteInput, ProductOptionSwatchInput, ProductOptionSyncItemInput, ProductOptionUpdateInput, ProductOptionValueCreateInput, ProductOptionValueSyncInput, ProductOptionValueUpdateInput, ProductOptionValuesInput, ProductOptionsSyncInput, ProductOrderByInput, ProductOrderField, ProductProductsMetaInput, ProductSeoInput, ProductSortBy, ProductSortInput, ProductStatus, ProductStatusAction, ProductTagOperationAction, ProductTagOperationInput, ProductUpdateInput, ProductUpdateStatusInput, ProductWhereInput, RichTextInput, SelectedOptionInput, SeoInput, SortDirection, StringFilter, SwatchType, TagCreateInput, TagDeleteInput, TagOrderByInput, TagOrderField, TagUpdateInput, TagWhereInput, ThresholdMethod, VariantCreateInput, VariantDeleteInput, VariantDimensionsOpInput, VariantInput, VariantInventoryOpInput, VariantMediaOpInput, VariantOperationAction, VariantOperationInput, VariantOptionLinkInput, VariantOptionsOpInput, VariantOrderByInput, VariantOrderField, VariantPricingOpInput, VariantUpdateMediaInput, VariantUpdateOptionsInput, VariantUpdatePricingInput, VariantWhereInput, VendorCreateInput, VendorOrderByInput, VendorOrderField, VendorWhereInput, WarehouseAssignableVariantOrderByInput, WarehouseAssignableVariantOrderField, WarehouseAssignableVariantWhereInput, WarehouseConnectionInput, WarehouseCreateInput, WarehouseDeleteInput, WarehouseOrderByInput, WarehouseOrderField, WarehouseStockConnectionInput, WarehouseStockCreateInput, WarehouseStockCreateItemInput, WarehouseStockDeleteInput, WarehouseStockDeleteItemInput, WarehouseStockOrderByInput, WarehouseStockOrderField, WarehouseStockWhereInput, WarehouseUpdateInput, WarehouseWhereInput, WeightInput, WeightUnit } from './types.js'

type Properties<T> = Required<{
  [K in keyof T]: z.ZodType<T[K], any, T[K]>;
}>;

type definedNonNullAny = {};

export const isDefinedNonNullAny = (v: any): v is definedNonNullAny => v !== undefined && v !== null;

export const definedNonNullAnySchema = z.any().refine((v) => isDefinedNonNullAny(v));

export const BulkUpdateCancelReasonSchema = z.nativeEnum(BulkUpdateCancelReason);

export const BulkUpdateItemStatusSchema = z.nativeEnum(BulkUpdateItemStatus);

export const BulkUpdateJobStatusSchema = z.nativeEnum(BulkUpdateJobStatus);

export const BulkUpdateOpTypeSchema = z.nativeEnum(BulkUpdateOpType);

export const CategoryHierarchyScopeDirectionSchema = z.nativeEnum(CategoryHierarchyScopeDirection);

export const CategoryHierarchyScopeModeSchema = z.nativeEnum(CategoryHierarchyScopeMode);

export const CategoryOrderFieldSchema = z.nativeEnum(CategoryOrderField);

export const CategoryStatusSchema = z.nativeEnum(CategoryStatus);

export const CollectionTypeSchema = z.nativeEnum(CollectionType);

export const CurrencyCodeSchema = z.nativeEnum(CurrencyCode);

export const DimensionUnitSchema = z.nativeEnum(DimensionUnit);

export const FacetSelectionModeSchema = z.nativeEnum(FacetSelectionMode);

export const FacetTypeSchema = z.nativeEnum(FacetType);

export const FacetUiTypeSchema = z.nativeEnum(FacetUiType);

export const FacetValueSortSchema = z.nativeEnum(FacetValueSort);

export const InventoryItemOrderFieldSchema = z.nativeEnum(InventoryItemOrderField);

export const InventoryItemWarehouseScopeModeSchema = z.nativeEnum(InventoryItemWarehouseScopeMode);

export const LocaleCodeSchema = z.nativeEnum(LocaleCode);

export const OperationTypeSchema = z.nativeEnum(OperationType);

export const OptionDisplayTypeSchema = z.nativeEnum(OptionDisplayType);

export const ProductCategoryOperationActionSchema = z.nativeEnum(ProductCategoryOperationAction);

export const ProductOrderFieldSchema = z.nativeEnum(ProductOrderField);

export const ProductSortBySchema = z.nativeEnum(ProductSortBy);

export const ProductStatusSchema = z.nativeEnum(ProductStatus);

export const ProductStatusActionSchema = z.nativeEnum(ProductStatusAction);

export const ProductTagOperationActionSchema = z.nativeEnum(ProductTagOperationAction);

export const SortDirectionSchema = z.nativeEnum(SortDirection);

export const SwatchTypeSchema = z.nativeEnum(SwatchType);

export const TagOrderFieldSchema = z.nativeEnum(TagOrderField);

export const ThresholdMethodSchema = z.nativeEnum(ThresholdMethod);

export const VariantOperationActionSchema = z.nativeEnum(VariantOperationAction);

export const VariantOrderFieldSchema = z.nativeEnum(VariantOrderField);

export const VendorOrderFieldSchema = z.nativeEnum(VendorOrderField);

export const WarehouseAssignableVariantOrderFieldSchema = z.nativeEnum(WarehouseAssignableVariantOrderField);

export const WarehouseOrderFieldSchema = z.nativeEnum(WarehouseOrderField);

export const WarehouseStockOrderFieldSchema = z.nativeEnum(WarehouseStockOrderField);

export const WeightUnitSchema = z.nativeEnum(WeightUnit);

export function BooleanFilterSchema(): z.ZodObject<Properties<BooleanFilter>> {
  return z.object({
    _eq: z.boolean().nullish(),
    _is: z.boolean().nullish(),
    _isNot: z.boolean().nullish(),
    _neq: z.boolean().nullish()
  })
}

export function CategoryCategoriesMetaInputSchema(): z.ZodObject<Properties<CategoryCategoriesMetaInput>> {
  return z.object({
    hierarchyScope: z.lazy(() => CategoryHierarchyScopeInputSchema().nullish()),
    productsScope: z.lazy(() => CategoryProductsScopeInputSchema().nullish())
  })
}

export function CategoryContentInputSchema(): z.ZodObject<Properties<CategoryContentInput>> {
  return z.object({
    description: z.lazy(() => RichTextInputSchema().nullish()),
    excerpt: z.lazy(() => RichTextInputSchema().nullish())
  })
}

export function CategoryCreateInputSchema(): z.ZodObject<Properties<CategoryCreateInput>> {
  return z.object({
    description: z.lazy(() => RichTextInputSchema().nullish()),
    excerpt: z.lazy(() => RichTextInputSchema().nullish()),
    handle: z.string(),
    mediaFileIds: z.array(z.string()).nullish(),
    name: z.string(),
    parentId: z.string().nullish(),
    publish: z.boolean().nullish(),
    seo: z.lazy(() => SeoInputSchema().nullish())
  })
}

export function CategoryDeleteInputSchema(): z.ZodObject<Properties<CategoryDeleteInput>> {
  return z.object({
    id: z.string(),
    permanent: z.boolean().nullish()
  })
}

export function CategoryHierarchyInputSchema(): z.ZodObject<Properties<CategoryHierarchyInput>> {
  return z.object({
    parentId: z.string().nullish()
  })
}

export function CategoryHierarchyScopeInputSchema(): z.ZodObject<Properties<CategoryHierarchyScopeInput>> {
  return z.object({
    direction: CategoryHierarchyScopeDirectionSchema,
    includeReference: z.boolean().default(false).nullish(),
    mode: CategoryHierarchyScopeModeSchema,
    referenceId: z.string()
  })
}

export function CategoryMediaInputSchema(): z.ZodObject<Properties<CategoryMediaInput>> {
  return z.object({
    fileIds: z.array(z.string())
  })
}

export function CategoryMoveInputSchema(): z.ZodObject<Properties<CategoryMoveInput>> {
  return z.object({
    id: z.string(),
    newParentId: z.string().nullish()
  })
}

export function CategoryOrderByInputSchema(): z.ZodObject<Properties<CategoryOrderByInput>> {
  return z.object({
    direction: SortDirectionSchema,
    field: CategoryOrderFieldSchema
  })
}

export function CategoryProductWhereInputSchema(): z.ZodObject<Properties<CategoryProductWhereInput>> {
  return z.object({
    _and: z.array(z.lazy(() => CategoryProductWhereInputSchema())).nullish(),
    _not: z.lazy(() => CategoryProductWhereInputSchema().nullish()),
    _or: z.array(z.lazy(() => CategoryProductWhereInputSchema())).nullish(),
    createdAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    deletedAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    id: z.lazy(() => IdFilterSchema().nullish())
  })
}

export function CategoryProductsScopeInputSchema(): z.ZodObject<Properties<CategoryProductsScopeInput>> {
  return z.object({
    mode: CategoryHierarchyScopeModeSchema,
    referenceIds: z.array(z.string())
  })
}

export function CategoryRebalanceInputSchema(): z.ZodObject<Properties<CategoryRebalanceInput>> {
  return z.object({
    categoryId: z.string()
  })
}

export function CategorySortInputSchema(): z.ZodObject<Properties<CategorySortInput>> {
  return z.object({
    defaultSort: ProductSortBySchema,
    defaultSortDirection: SortDirectionSchema
  })
}

export function CategoryUpdateInputSchema(): z.ZodObject<Properties<CategoryUpdateInput>> {
  return z.object({
    content: z.lazy(() => CategoryContentInputSchema().nullish()),
    handle: z.string().nullish(),
    hierarchy: z.lazy(() => CategoryHierarchyInputSchema().nullish()),
    media: z.lazy(() => CategoryMediaInputSchema().nullish()),
    name: z.string().nullish(),
    seo: z.lazy(() => SeoInputSchema().nullish()),
    sort: z.lazy(() => CategorySortInputSchema().nullish()),
    status: CategoryStatusSchema.nullish()
  })
}

export function CategoryWhereInputSchema(): z.ZodObject<Properties<CategoryWhereInput>> {
  return z.object({
    _and: z.array(z.lazy(() => CategoryWhereInputSchema())).nullish(),
    _not: z.lazy(() => CategoryWhereInputSchema().nullish()),
    _or: z.array(z.lazy(() => CategoryWhereInputSchema())).nullish(),
    createdAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    defaultSort: z.lazy(() => StringFilterSchema().nullish()),
    defaultSortDirection: z.lazy(() => StringFilterSchema().nullish()),
    depth: z.lazy(() => IntFilterSchema().nullish()),
    handle: z.lazy(() => StringFilterSchema().nullish()),
    id: z.lazy(() => IdFilterSchema().nullish()),
    locale: z.lazy(() => StringFilterSchema().nullish()),
    name: z.lazy(() => StringFilterSchema().nullish()),
    parentId: z.lazy(() => IdFilterSchema().nullish()),
    path: z.lazy(() => StringFilterSchema().nullish()),
    productsCount: z.lazy(() => IntFilterSchema().nullish()),
    publishedAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    updatedAt: z.lazy(() => DateTimeFilterSchema().nullish())
  })
}

export function CollectionAddProductsInputSchema(): z.ZodObject<Properties<CollectionAddProductsInput>> {
  return z.object({
    collectionId: z.string(),
    productIds: z.array(z.string())
  })
}

export function CollectionCreateInputSchema(): z.ZodObject<Properties<CollectionCreateInput>> {
  return z.object({
    activeFrom: z.string().nullish(),
    activeTo: z.string().nullish(),
    defaultSort: ProductSortBySchema.nullish(),
    defaultSortDirection: SortDirectionSchema.nullish(),
    description: z.lazy(() => RichTextInputSchema().nullish()),
    excerpt: z.lazy(() => RichTextInputSchema().nullish()),
    handle: z.string().nullish(),
    media: z.array(z.lazy(() => CollectionMediaInputSchema())).nullish(),
    name: z.string(),
    publish: z.boolean().nullish(),
    seo: z.lazy(() => SeoInputSchema().nullish()),
    type: CollectionTypeSchema
  })
}

export function CollectionDeleteInputSchema(): z.ZodObject<Properties<CollectionDeleteInput>> {
  return z.object({
    id: z.string()
  })
}

export function CollectionMediaInputSchema(): z.ZodObject<Properties<CollectionMediaInput>> {
  return z.object({
    fileId: z.string(),
    sortIndex: z.number().nullish()
  })
}

export function CollectionMoveProductInputSchema(): z.ZodObject<Properties<CollectionMoveProductInput>> {
  return z.object({
    afterProductId: z.string().nullish(),
    beforeProductId: z.string().nullish(),
    collectionId: z.string(),
    productId: z.string()
  })
}

export function CollectionRemoveProductsInputSchema(): z.ZodObject<Properties<CollectionRemoveProductsInput>> {
  return z.object({
    collectionId: z.string(),
    productIds: z.array(z.string())
  })
}

export function CollectionRuleInputSchema(): z.ZodObject<Properties<CollectionRuleInput>> {
  return z.object({
    field: z.string(),
    operator: z.string(),
    value: z.record(z.unknown())
  })
}

export function CollectionUpdateInputSchema(): z.ZodObject<Properties<CollectionUpdateInput>> {
  return z.object({
    activeFrom: z.string().nullish(),
    activeTo: z.string().nullish(),
    defaultSort: ProductSortBySchema.nullish(),
    defaultSortDirection: SortDirectionSchema.nullish(),
    description: z.lazy(() => RichTextInputSchema().nullish()),
    excerpt: z.lazy(() => RichTextInputSchema().nullish()),
    handle: z.string().nullish(),
    id: z.string(),
    media: z.array(z.lazy(() => CollectionMediaInputSchema())).nullish(),
    name: z.string().nullish(),
    publish: z.boolean().nullish(),
    seo: z.lazy(() => SeoInputSchema().nullish())
  })
}

export function CollectionUpdateRulesInputSchema(): z.ZodObject<Properties<CollectionUpdateRulesInput>> {
  return z.object({
    collectionId: z.string(),
    rules: z.array(z.lazy(() => CollectionRuleInputSchema()))
  })
}

export function DateTimeFilterSchema(): z.ZodObject<Properties<DateTimeFilter>> {
  return z.object({
    _between: z.array(z.string()).nullish(),
    _eq: z.string().nullish(),
    _gt: z.string().nullish(),
    _gte: z.string().nullish(),
    _in: z.array(z.string()).nullish(),
    _is: z.boolean().nullish(),
    _isNot: z.boolean().nullish(),
    _lt: z.string().nullish(),
    _lte: z.string().nullish(),
    _neq: z.string().nullish(),
    _notIn: z.array(z.string()).nullish()
  })
}

export function DimensionsInputSchema(): z.ZodObject<Properties<DimensionsInput>> {
  return z.object({
    height: z.number(),
    length: z.number(),
    width: z.number()
  })
}

export function FacetCreateInputSchema(): z.ZodObject<Properties<FacetCreateInput>> {
  return z.object({
    facetType: FacetTypeSchema,
    groupId: z.string().nullish(),
    label: z.string(),
    selectionMode: FacetSelectionModeSchema.nullish(),
    slug: z.string(),
    sortIndex: z.number().nullish(),
    uiType: FacetUiTypeSchema.nullish()
  })
}

export function FacetDeleteInputSchema(): z.ZodObject<Properties<FacetDeleteInput>> {
  return z.object({
    id: z.string()
  })
}

export function FacetGroupCreateInputSchema(): z.ZodObject<Properties<FacetGroupCreateInput>> {
  return z.object({
    collapsed: z.boolean().nullish(),
    name: z.string(),
    sortIndex: z.number().nullish()
  })
}

export function FacetGroupDeleteInputSchema(): z.ZodObject<Properties<FacetGroupDeleteInput>> {
  return z.object({
    id: z.string()
  })
}

export function FacetGroupUpdateInputSchema(): z.ZodObject<Properties<FacetGroupUpdateInput>> {
  return z.object({
    collapsed: z.boolean().nullish(),
    id: z.string(),
    name: z.string().nullish(),
    sortIndex: z.number().nullish()
  })
}

export function FacetSwatchCreateInputSchema(): z.ZodObject<Properties<FacetSwatchCreateInput>> {
  return z.object({
    colorOne: z.string().nullish(),
    colorTwo: z.string().nullish(),
    fileId: z.string().nullish(),
    metadata: z.record(z.unknown()).nullish(),
    swatchType: SwatchTypeSchema
  })
}

export function FacetSwatchDeleteInputSchema(): z.ZodObject<Properties<FacetSwatchDeleteInput>> {
  return z.object({
    id: z.string()
  })
}

export function FacetSwatchUpdateInputSchema(): z.ZodObject<Properties<FacetSwatchUpdateInput>> {
  return z.object({
    colorOne: z.string().nullish(),
    colorTwo: z.string().nullish(),
    fileId: z.string().nullish(),
    id: z.string(),
    metadata: z.record(z.unknown()).nullish(),
    swatchType: SwatchTypeSchema.nullish()
  })
}

export function FacetUpdateInputSchema(): z.ZodObject<Properties<FacetUpdateInput>> {
  return z.object({
    groupId: z.string().nullish(),
    id: z.string(),
    indexable: z.boolean().nullish(),
    label: z.string().nullish(),
    maxValuesVisible: z.number().nullish(),
    minValues: z.number().nullish(),
    selectionMode: FacetSelectionModeSchema.nullish(),
    slug: z.string().nullish(),
    sortIndex: z.number().nullish(),
    uiType: FacetUiTypeSchema.nullish(),
    valueSort: FacetValueSortSchema.nullish()
  })
}

export function FacetValueCreateInputSchema(): z.ZodObject<Properties<FacetValueCreateInput>> {
  return z.object({
    enabled: z.boolean().nullish(),
    facetId: z.string(),
    label: z.string(),
    slug: z.string(),
    sortIndex: z.number().nullish(),
    sourceHandles: z.array(z.string()).nullish(),
    swatchId: z.string().nullish()
  })
}

export function FacetValueDeleteInputSchema(): z.ZodObject<Properties<FacetValueDeleteInput>> {
  return z.object({
    id: z.string()
  })
}

export function FacetValueUpdateInputSchema(): z.ZodObject<Properties<FacetValueUpdateInput>> {
  return z.object({
    enabled: z.boolean().nullish(),
    id: z.string(),
    label: z.string().nullish(),
    slug: z.string().nullish(),
    sortIndex: z.number().nullish(),
    sourceHandles: z.array(z.string()).nullish(),
    swatchId: z.string().nullish()
  })
}

export function FloatFilterSchema(): z.ZodObject<Properties<FloatFilter>> {
  return z.object({
    _between: z.array(z.number()).nullish(),
    _eq: z.number().nullish(),
    _gt: z.number().nullish(),
    _gte: z.number().nullish(),
    _in: z.array(z.number()).nullish(),
    _is: z.boolean().nullish(),
    _isNot: z.boolean().nullish(),
    _lt: z.number().nullish(),
    _lte: z.number().nullish(),
    _neq: z.number().nullish(),
    _notIn: z.array(z.number()).nullish()
  })
}

export function IdFilterSchema(): z.ZodObject<Properties<IdFilter>> {
  return z.object({
    _eq: z.string().nullish(),
    _in: z.array(z.string()).nullish(),
    _is: z.boolean().nullish(),
    _isNot: z.boolean().nullish(),
    _neq: z.string().nullish(),
    _notIn: z.array(z.string()).nullish()
  })
}

export function IntFilterSchema(): z.ZodObject<Properties<IntFilter>> {
  return z.object({
    _between: z.array(z.number()).nullish(),
    _eq: z.number().nullish(),
    _gt: z.number().nullish(),
    _gte: z.number().nullish(),
    _in: z.array(z.number()).nullish(),
    _is: z.boolean().nullish(),
    _isNot: z.boolean().nullish(),
    _lt: z.number().nullish(),
    _lte: z.number().nullish(),
    _neq: z.number().nullish(),
    _notIn: z.array(z.number()).nullish()
  })
}

export function InventoryItemCostInputSchema(): z.ZodObject<Properties<InventoryItemCostInput>> {
  return z.object({
    amountMinor: z.string(),
    currency: z.string()
  })
}

export function InventoryItemInputSchema(): z.ZodObject<Properties<InventoryItemInput>> {
  return z.object({
    continueSellingWhenOutOfStock: z.boolean().nullish(),
    sku: z.string().nullish(),
    tracked: z.boolean()
  })
}

export function InventoryItemInventoryItemsMetaInputSchema(): z.ZodObject<Properties<InventoryItemInventoryItemsMetaInput>> {
  return z.object({
    warehouseScope: z.lazy(() => InventoryItemWarehouseScopeInputSchema().nullish())
  })
}

export function InventoryItemOrderByInputSchema(): z.ZodObject<Properties<InventoryItemOrderByInput>> {
  return z.object({
    direction: SortDirectionSchema,
    field: InventoryItemOrderFieldSchema
  })
}

export function InventoryItemStockInputSchema(): z.ZodObject<Properties<InventoryItemStockInput>> {
  return z.object({
    onHand: z.number(),
    unavailable: z.number().nullish(),
    warehouseId: z.string()
  })
}

export function InventoryItemUpdateInputSchema(): z.ZodObject<Properties<InventoryItemUpdateInput>> {
  return z.object({
    continueSellingWhenOutOfStock: z.boolean().nullish(),
    id: z.string(),
    sku: z.string().nullish(),
    stock: z.lazy(() => InventoryItemStockInputSchema().nullish()),
    trackInventory: z.boolean().nullish(),
    unitCost: z.lazy(() => InventoryItemCostInputSchema().nullish())
  })
}

export function InventoryItemWarehouseScopeInputSchema(): z.ZodObject<Properties<InventoryItemWarehouseScopeInput>> {
  return z.object({
    mode: InventoryItemWarehouseScopeModeSchema,
    referenceIds: z.array(z.string())
  })
}

export function InventoryItemWhereInputSchema(): z.ZodObject<Properties<InventoryItemWhereInput>> {
  return z.object({
    _and: z.array(z.lazy(() => InventoryItemWhereInputSchema())).nullish(),
    _not: z.lazy(() => InventoryItemWhereInputSchema().nullish()),
    _or: z.array(z.lazy(() => InventoryItemWhereInputSchema())).nullish(),
    availableForSale: z.lazy(() => IntFilterSchema().nullish()),
    id: z.lazy(() => IdFilterSchema().nullish()),
    productId: z.lazy(() => IdFilterSchema().nullish()),
    productName: z.lazy(() => StringFilterSchema().nullish()),
    quantityOnHand: z.lazy(() => IntFilterSchema().nullish()),
    reservedQuantity: z.lazy(() => IntFilterSchema().nullish()),
    sku: z.lazy(() => StringFilterSchema().nullish()),
    trackInventory: z.lazy(() => BooleanFilterSchema().nullish()),
    unavailableQuantity: z.lazy(() => IntFilterSchema().nullish()),
    variantId: z.lazy(() => IdFilterSchema().nullish())
  })
}

export function ListingOrderByInputSchema(): z.ZodObject<Properties<ListingOrderByInput>> {
  return z.object({
    direction: SortDirectionSchema.nullish(),
    field: ProductSortBySchema
  })
}

export function PricingWidgetInputSchema(): z.ZodObject<Properties<PricingWidgetInput>> {
  return z.object({
    after: z.string().nullish(),
    currency: CurrencyCodeSchema,
    first: z.number().nullish(),
    from: z.string().nullish(),
    to: z.string().nullish(),
    variantId: z.string()
  })
}

export function ProductBulkUpdateInputSchema(): z.ZodObject<Properties<ProductBulkUpdateInput>> {
  return z.object({
    products: z.array(z.lazy(() => ProductBulkUpdateItemSchema()))
  })
}

export function ProductBulkUpdateItemSchema(): z.ZodObject<Properties<ProductBulkUpdateItem>> {
  return z.object({
    expectedRevision: z.number().nullish(),
    operations: z.lazy(() => ProductUpdateInputSchema().nullish()),
    productId: z.string()
  })
}

export function ProductCategoriesScopeInputSchema(): z.ZodObject<Properties<ProductCategoriesScopeInput>> {
  return z.object({
    mode: CategoryHierarchyScopeModeSchema,
    referenceIds: z.array(z.string())
  })
}

export function ProductCategoryOperationInputSchema(): z.ZodObject<Properties<ProductCategoryOperationInput>> {
  return z.object({
    action: ProductCategoryOperationActionSchema,
    afterProductId: z.string().nullish(),
    beforeProductId: z.string().nullish(),
    categoryId: z.string()
  })
}

export function ProductContentInputSchema(): z.ZodObject<Properties<ProductContentInput>> {
  return z.object({
    description: z.lazy(() => RichTextInputSchema().nullish()),
    excerpt: z.lazy(() => RichTextInputSchema().nullish())
  })
}

export function ProductCreateInputSchema(): z.ZodObject<Properties<ProductCreateInput>> {
  return z.object({
    description: z.lazy(() => RichTextInputSchema().nullish()),
    excerpt: z.lazy(() => RichTextInputSchema().nullish()),
    handle: z.string(),
    inventoryItem: z.lazy(() => InventoryItemInputSchema().nullish()),
    mediaFileIds: z.array(z.string()).nullish(),
    options: z.array(z.lazy(() => ProductCreateOptionInputSchema())).nullish(),
    title: z.string(),
    variants: z.array(z.lazy(() => ProductCreateVariantInputSchema())).nullish(),
    vendorId: z.string().nullish()
  })
}

export function ProductCreateOptionInputSchema(): z.ZodObject<Properties<ProductCreateOptionInput>> {
  return z.object({
    displayType: z.string().nullish(),
    name: z.string(),
    slug: z.string(),
    sortIndex: z.number().nullish(),
    values: z.array(z.lazy(() => ProductCreateOptionValueInputSchema()))
  })
}

export function ProductCreateOptionValueInputSchema(): z.ZodObject<Properties<ProductCreateOptionValueInput>> {
  return z.object({
    name: z.string(),
    slug: z.string(),
    sortIndex: z.number().nullish()
  })
}

export function ProductCreateVariantInputSchema(): z.ZodObject<Properties<ProductCreateVariantInput>> {
  return z.object({
    handle: z.string()
  })
}

export function ProductDeleteInputSchema(): z.ZodObject<Properties<ProductDeleteInput>> {
  return z.object({
    id: z.string(),
    permanent: z.boolean().nullish()
  })
}

export function ProductFeatureCreateInputSchema(): z.ZodObject<Properties<ProductFeatureCreateInput>> {
  return z.object({
    name: z.string(),
    productId: z.string(),
    slug: z.string(),
    values: z.array(z.lazy(() => ProductFeatureValueCreateInputSchema()))
  })
}

export function ProductFeatureDeleteInputSchema(): z.ZodObject<Properties<ProductFeatureDeleteInput>> {
  return z.object({
    id: z.string()
  })
}

export function ProductFeatureInputSchema(): z.ZodObject<Properties<ProductFeatureInput>> {
  return z.object({
    name: z.string(),
    slug: z.string(),
    values: z.array(z.lazy(() => ProductFeatureValueCreateInputSchema()))
  })
}

export function ProductFeatureSyncItemInputSchema(): z.ZodObject<Properties<ProductFeatureSyncItemInput>> {
  return z.object({
    id: z.string().nullish(),
    index: z.array(z.number()),
    isGroup: z.boolean(),
    name: z.string(),
    slug: z.string(),
    values: z.array(z.lazy(() => ProductFeatureValueSyncInputSchema())).nullish()
  })
}

export function ProductFeatureUpdateInputSchema(): z.ZodObject<Properties<ProductFeatureUpdateInput>> {
  return z.object({
    id: z.string(),
    name: z.string().nullish(),
    slug: z.string().nullish(),
    values: z.lazy(() => ProductFeatureValuesInputSchema().nullish())
  })
}

export function ProductFeatureValueCreateInputSchema(): z.ZodObject<Properties<ProductFeatureValueCreateInput>> {
  return z.object({
    name: z.string(),
    slug: z.string()
  })
}

export function ProductFeatureValueSyncInputSchema(): z.ZodObject<Properties<ProductFeatureValueSyncInput>> {
  return z.object({
    id: z.string().nullish(),
    index: z.number(),
    name: z.string(),
    slug: z.string()
  })
}

export function ProductFeatureValueUpdateInputSchema(): z.ZodObject<Properties<ProductFeatureValueUpdateInput>> {
  return z.object({
    id: z.string(),
    name: z.string().nullish(),
    slug: z.string().nullish()
  })
}

export function ProductFeatureValuesInputSchema(): z.ZodObject<Properties<ProductFeatureValuesInput>> {
  return z.object({
    create: z.array(z.lazy(() => ProductFeatureValueCreateInputSchema())).nullish(),
    delete: z.array(z.string()).nullish(),
    update: z.array(z.lazy(() => ProductFeatureValueUpdateInputSchema())).nullish()
  })
}

export function ProductFeaturesSyncInputSchema(): z.ZodObject<Properties<ProductFeaturesSyncInput>> {
  return z.object({
    features: z.array(z.lazy(() => ProductFeatureSyncItemInputSchema())),
    productId: z.string()
  })
}

export function ProductMediaInputSchema(): z.ZodObject<Properties<ProductMediaInput>> {
  return z.object({
    fileIds: z.array(z.string())
  })
}

export function ProductOptionCreateInputSchema(): z.ZodObject<Properties<ProductOptionCreateInput>> {
  return z.object({
    displayType: OptionDisplayTypeSchema,
    name: z.string(),
    productId: z.string().nullish(),
    slug: z.string(),
    sortIndex: z.number().nullish(),
    values: z.array(z.lazy(() => ProductOptionValueCreateInputSchema()))
  })
}

export function ProductOptionDeleteInputSchema(): z.ZodObject<Properties<ProductOptionDeleteInput>> {
  return z.object({
    id: z.string()
  })
}

export function ProductOptionSwatchInputSchema(): z.ZodObject<Properties<ProductOptionSwatchInput>> {
  return z.object({
    colorOne: z.string().nullish(),
    colorTwo: z.string().nullish(),
    fileId: z.string().nullish(),
    metadata: z.record(z.unknown()).nullish(),
    swatchType: SwatchTypeSchema
  })
}

export function ProductOptionSyncItemInputSchema(): z.ZodObject<Properties<ProductOptionSyncItemInput>> {
  return z.object({
    displayType: OptionDisplayTypeSchema,
    id: z.string().nullish(),
    name: z.string(),
    slug: z.string(),
    sortIndex: z.number(),
    values: z.array(z.lazy(() => ProductOptionValueSyncInputSchema()))
  })
}

export function ProductOptionUpdateInputSchema(): z.ZodObject<Properties<ProductOptionUpdateInput>> {
  return z.object({
    displayType: OptionDisplayTypeSchema.nullish(),
    id: z.string(),
    name: z.string().nullish(),
    slug: z.string().nullish(),
    sortIndex: z.number().nullish(),
    values: z.lazy(() => ProductOptionValuesInputSchema().nullish())
  })
}

export function ProductOptionValueCreateInputSchema(): z.ZodObject<Properties<ProductOptionValueCreateInput>> {
  return z.object({
    name: z.string(),
    slug: z.string(),
    sortIndex: z.number().nullish(),
    swatch: z.lazy(() => ProductOptionSwatchInputSchema().nullish())
  })
}

export function ProductOptionValueSyncInputSchema(): z.ZodObject<Properties<ProductOptionValueSyncInput>> {
  return z.object({
    id: z.string().nullish(),
    name: z.string(),
    slug: z.string(),
    sortIndex: z.number(),
    swatch: z.lazy(() => ProductOptionSwatchInputSchema().nullish())
  })
}

export function ProductOptionValueUpdateInputSchema(): z.ZodObject<Properties<ProductOptionValueUpdateInput>> {
  return z.object({
    id: z.string(),
    name: z.string().nullish(),
    slug: z.string().nullish(),
    sortIndex: z.number().nullish(),
    swatch: z.lazy(() => ProductOptionSwatchInputSchema().nullish())
  })
}

export function ProductOptionValuesInputSchema(): z.ZodObject<Properties<ProductOptionValuesInput>> {
  return z.object({
    create: z.array(z.lazy(() => ProductOptionValueCreateInputSchema())).nullish(),
    delete: z.array(z.string()).nullish(),
    update: z.array(z.lazy(() => ProductOptionValueUpdateInputSchema())).nullish()
  })
}

export function ProductOptionsSyncInputSchema(): z.ZodObject<Properties<ProductOptionsSyncInput>> {
  return z.object({
    options: z.array(z.lazy(() => ProductOptionSyncItemInputSchema())),
    productId: z.string()
  })
}

export function ProductOrderByInputSchema(): z.ZodObject<Properties<ProductOrderByInput>> {
  return z.object({
    direction: SortDirectionSchema,
    field: ProductOrderFieldSchema
  })
}

export function ProductProductsMetaInputSchema(): z.ZodObject<Properties<ProductProductsMetaInput>> {
  return z.object({
    categoriesScope: z.lazy(() => ProductCategoriesScopeInputSchema().nullish())
  })
}

export function ProductSeoInputSchema(): z.ZodObject<Properties<ProductSeoInput>> {
  return z.object({
    ogDescription: z.string().nullish(),
    ogImageId: z.string().nullish(),
    ogTitle: z.string().nullish(),
    seoDescription: z.string().nullish(),
    seoTitle: z.string().nullish()
  })
}

export function ProductSortInputSchema(): z.ZodObject<Properties<ProductSortInput>> {
  return z.object({
    by: ProductSortBySchema,
    direction: SortDirectionSchema.nullish()
  })
}

export function ProductTagOperationInputSchema(): z.ZodObject<Properties<ProductTagOperationInput>> {
  return z.object({
    action: ProductTagOperationActionSchema,
    tagId: z.string()
  })
}

export function ProductUpdateInputSchema(): z.ZodObject<Properties<ProductUpdateInput>> {
  return z.object({
    categories: z.array(z.lazy(() => ProductCategoryOperationInputSchema())).nullish(),
    content: z.lazy(() => ProductContentInputSchema().nullish()),
    handle: z.string().nullish(),
    media: z.lazy(() => ProductMediaInputSchema().nullish()),
    seo: z.lazy(() => ProductSeoInputSchema().nullish()),
    status: ProductStatusSchema.nullish(),
    tags: z.array(z.lazy(() => ProductTagOperationInputSchema())).nullish(),
    title: z.string().nullish(),
    variants: z.array(z.lazy(() => VariantOperationInputSchema())).nullish(),
    vendorId: z.string().nullish()
  })
}

export function ProductUpdateStatusInputSchema(): z.ZodObject<Properties<ProductUpdateStatusInput>> {
  return z.object({
    action: ProductStatusActionSchema,
    productId: z.string()
  })
}

export function ProductWhereInputSchema(): z.ZodObject<Properties<ProductWhereInput>> {
  return z.object({
    _and: z.array(z.lazy(() => ProductWhereInputSchema())).nullish(),
    _not: z.lazy(() => ProductWhereInputSchema().nullish()),
    _or: z.array(z.lazy(() => ProductWhereInputSchema())).nullish(),
    brandName: z.lazy(() => StringFilterSchema().nullish()),
    createdAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    currency: z.lazy(() => StringFilterSchema().nullish()),
    handle: z.lazy(() => StringFilterSchema().nullish()),
    id: z.lazy(() => IdFilterSchema().nullish()),
    locale: z.lazy(() => StringFilterSchema().nullish()),
    maxPriceMinor: z.lazy(() => IntFilterSchema().nullish()),
    minPriceMinor: z.lazy(() => IntFilterSchema().nullish()),
    name: z.lazy(() => StringFilterSchema().nullish()),
    primaryCategoryId: z.lazy(() => IdFilterSchema().nullish()),
    primaryCategoryName: z.lazy(() => StringFilterSchema().nullish()),
    publishedAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    updatedAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    vendorId: z.lazy(() => IdFilterSchema().nullish())
  })
}

export function RichTextInputSchema(): z.ZodObject<Properties<RichTextInput>> {
  return z.object({
    html: z.string(),
    json: z.record(z.unknown()),
    text: z.string()
  })
}

export function SelectedOptionInputSchema(): z.ZodObject<Properties<SelectedOptionInput>> {
  return z.object({
    optionId: z.string(),
    optionValueId: z.string()
  })
}

export function SeoInputSchema(): z.ZodObject<Properties<SeoInput>> {
  return z.object({
    ogDescription: z.string().nullish(),
    ogImageId: z.string().nullish(),
    ogTitle: z.string().nullish(),
    seoDescription: z.string().nullish(),
    seoTitle: z.string().nullish()
  })
}

export function StringFilterSchema(): z.ZodObject<Properties<StringFilter>> {
  return z.object({
    _contains: z.string().nullish(),
    _containsi: z.string().nullish(),
    _endsWith: z.string().nullish(),
    _endsWithi: z.string().nullish(),
    _eq: z.string().nullish(),
    _in: z.array(z.string()).nullish(),
    _is: z.boolean().nullish(),
    _isNot: z.boolean().nullish(),
    _neq: z.string().nullish(),
    _notContains: z.string().nullish(),
    _notContainsi: z.string().nullish(),
    _notIn: z.array(z.string()).nullish(),
    _startsWith: z.string().nullish(),
    _startsWithi: z.string().nullish()
  })
}

export function TagCreateInputSchema(): z.ZodObject<Properties<TagCreateInput>> {
  return z.object({
    handle: z.string(),
    name: z.string().nullish()
  })
}

export function TagDeleteInputSchema(): z.ZodObject<Properties<TagDeleteInput>> {
  return z.object({
    id: z.string()
  })
}

export function TagOrderByInputSchema(): z.ZodObject<Properties<TagOrderByInput>> {
  return z.object({
    direction: SortDirectionSchema,
    field: TagOrderFieldSchema
  })
}

export function TagUpdateInputSchema(): z.ZodObject<Properties<TagUpdateInput>> {
  return z.object({
    handle: z.string().nullish(),
    id: z.string(),
    name: z.string().nullish()
  })
}

export function TagWhereInputSchema(): z.ZodObject<Properties<TagWhereInput>> {
  return z.object({
    _and: z.array(z.lazy(() => TagWhereInputSchema())).nullish(),
    _not: z.lazy(() => TagWhereInputSchema().nullish()),
    _or: z.array(z.lazy(() => TagWhereInputSchema())).nullish(),
    createdAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    handle: z.lazy(() => StringFilterSchema().nullish()),
    id: z.lazy(() => IdFilterSchema().nullish()),
    locale: z.lazy(() => StringFilterSchema().nullish()),
    name: z.lazy(() => StringFilterSchema().nullish()),
    productsCount: z.lazy(() => IntFilterSchema().nullish()),
    projectId: z.lazy(() => IdFilterSchema().nullish())
  })
}

export function VariantCreateInputSchema(): z.ZodObject<Properties<VariantCreateInput>> {
  return z.object({
    productId: z.string(),
    variant: z.lazy(() => VariantInputSchema())
  })
}

export function VariantDeleteInputSchema(): z.ZodObject<Properties<VariantDeleteInput>> {
  return z.object({
    id: z.string(),
    permanent: z.boolean().nullish()
  })
}

export function VariantDimensionsOpInputSchema(): z.ZodObject<Properties<VariantDimensionsOpInput>> {
  return z.object({
    height: z.number(),
    length: z.number(),
    width: z.number()
  })
}

export function VariantInputSchema(): z.ZodObject<Properties<VariantInput>> {
  return z.object({
    externalId: z.string().nullish(),
    externalSystem: z.string().nullish(),
    options: z.array(z.lazy(() => SelectedOptionInputSchema())),
    title: z.string().nullish()
  })
}

export function VariantInventoryOpInputSchema(): z.ZodObject<Properties<VariantInventoryOpInput>> {
  return z.object({
    costCurrency: CurrencyCodeSchema.nullish(),
    onHand: z.number(),
    sku: z.string().nullish(),
    unavailable: z.number().nullish(),
    unitCostMinor: z.string().nullish(),
    warehouseId: z.string()
  })
}

export function VariantMediaOpInputSchema(): z.ZodObject<Properties<VariantMediaOpInput>> {
  return z.object({
    fileIds: z.array(z.string())
  })
}

export function VariantOperationInputSchema(): z.ZodObject<Properties<VariantOperationInput>> {
  return z.object({
    action: VariantOperationActionSchema,
    clientMutationId: z.string().nullish(),
    dimensions: z.lazy(() => VariantDimensionsOpInputSchema().nullish()),
    inventory: z.lazy(() => VariantInventoryOpInputSchema().nullish()),
    media: z.lazy(() => VariantMediaOpInputSchema().nullish()),
    options: z.lazy(() => VariantOptionsOpInputSchema().nullish()),
    pricing: z.lazy(() => VariantPricingOpInputSchema().nullish()),
    variantId: z.string().nullish(),
    weight: z.number().nullish()
  })
}

export function VariantOptionLinkInputSchema(): z.ZodObject<Properties<VariantOptionLinkInput>> {
  return z.object({
    optionId: z.string(),
    optionValueId: z.string()
  })
}

export function VariantOptionsOpInputSchema(): z.ZodObject<Properties<VariantOptionsOpInput>> {
  return z.object({
    set: z.array(z.lazy(() => VariantOptionLinkInputSchema()))
  })
}

export function VariantOrderByInputSchema(): z.ZodObject<Properties<VariantOrderByInput>> {
  return z.object({
    direction: SortDirectionSchema,
    field: VariantOrderFieldSchema
  })
}

export function VariantPricingOpInputSchema(): z.ZodObject<Properties<VariantPricingOpInput>> {
  return z.object({
    amountMinor: z.string(),
    compareAtMinor: z.string().nullish(),
    currency: CurrencyCodeSchema
  })
}

export function VariantUpdateMediaInputSchema(): z.ZodObject<Properties<VariantUpdateMediaInput>> {
  return z.object({
    fileIds: z.array(z.string()),
    variantId: z.string()
  })
}

export function VariantUpdateOptionsInputSchema(): z.ZodObject<Properties<VariantUpdateOptionsInput>> {
  return z.object({
    links: z.array(z.lazy(() => VariantOptionLinkInputSchema())),
    variantId: z.string()
  })
}

export function VariantUpdatePricingInputSchema(): z.ZodObject<Properties<VariantUpdatePricingInput>> {
  return z.object({
    amountMinor: z.string(),
    compareAtMinor: z.string().nullish(),
    currency: CurrencyCodeSchema,
    variantId: z.string()
  })
}

export function VariantWhereInputSchema(): z.ZodObject<Properties<VariantWhereInput>> {
  return z.object({
    _and: z.array(z.lazy(() => VariantWhereInputSchema())).nullish(),
    _not: z.lazy(() => VariantWhereInputSchema().nullish()),
    _or: z.array(z.lazy(() => VariantWhereInputSchema())).nullish(),
    createdAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    externalId: z.lazy(() => StringFilterSchema().nullish()),
    externalSystem: z.lazy(() => StringFilterSchema().nullish()),
    handle: z.lazy(() => StringFilterSchema().nullish()),
    id: z.lazy(() => IdFilterSchema().nullish()),
    isDefault: z.lazy(() => BooleanFilterSchema().nullish()),
    productId: z.lazy(() => IdFilterSchema().nullish()),
    updatedAt: z.lazy(() => DateTimeFilterSchema().nullish())
  })
}

export function VendorCreateInputSchema(): z.ZodObject<Properties<VendorCreateInput>> {
  return z.object({
    name: z.string()
  })
}

export function VendorOrderByInputSchema(): z.ZodObject<Properties<VendorOrderByInput>> {
  return z.object({
    direction: SortDirectionSchema,
    field: VendorOrderFieldSchema
  })
}

export function VendorWhereInputSchema(): z.ZodObject<Properties<VendorWhereInput>> {
  return z.object({
    _and: z.array(z.lazy(() => VendorWhereInputSchema())).nullish(),
    _not: z.lazy(() => VendorWhereInputSchema().nullish()),
    _or: z.array(z.lazy(() => VendorWhereInputSchema())).nullish(),
    id: z.lazy(() => IdFilterSchema().nullish()),
    name: z.lazy(() => StringFilterSchema().nullish())
  })
}

export function WarehouseAssignableVariantOrderByInputSchema(): z.ZodObject<Properties<WarehouseAssignableVariantOrderByInput>> {
  return z.object({
    direction: SortDirectionSchema,
    field: WarehouseAssignableVariantOrderFieldSchema
  })
}

export function WarehouseAssignableVariantWhereInputSchema(): z.ZodObject<Properties<WarehouseAssignableVariantWhereInput>> {
  return z.object({
    _and: z.array(z.lazy(() => WarehouseAssignableVariantWhereInputSchema())).nullish(),
    _not: z.lazy(() => WarehouseAssignableVariantWhereInputSchema().nullish()),
    _or: z.array(z.lazy(() => WarehouseAssignableVariantWhereInputSchema())).nullish(),
    createdAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    externalId: z.lazy(() => StringFilterSchema().nullish()),
    externalSystem: z.lazy(() => StringFilterSchema().nullish()),
    handle: z.lazy(() => StringFilterSchema().nullish()),
    id: z.lazy(() => IdFilterSchema().nullish()),
    isDefault: z.lazy(() => BooleanFilterSchema().nullish()),
    productId: z.lazy(() => IdFilterSchema().nullish()),
    productName: z.lazy(() => StringFilterSchema().nullish()),
    sku: z.lazy(() => StringFilterSchema().nullish()),
    updatedAt: z.lazy(() => DateTimeFilterSchema().nullish())
  })
}

export function WarehouseConnectionInputSchema(): z.ZodObject<Properties<WarehouseConnectionInput>> {
  return z.object({
    after: z.string().nullish(),
    before: z.string().nullish(),
    first: z.number().nullish(),
    last: z.number().nullish(),
    orderBy: z.array(z.lazy(() => WarehouseOrderByInputSchema())).nullish(),
    where: z.lazy(() => WarehouseWhereInputSchema().nullish())
  })
}

export function WarehouseCreateInputSchema(): z.ZodObject<Properties<WarehouseCreateInput>> {
  return z.object({
    code: z.string(),
    isDefault: z.boolean().nullish(),
    name: z.string()
  })
}

export function WarehouseDeleteInputSchema(): z.ZodObject<Properties<WarehouseDeleteInput>> {
  return z.object({
    id: z.string()
  })
}

export function WarehouseOrderByInputSchema(): z.ZodObject<Properties<WarehouseOrderByInput>> {
  return z.object({
    direction: SortDirectionSchema,
    field: WarehouseOrderFieldSchema
  })
}

export function WarehouseStockConnectionInputSchema(): z.ZodObject<Properties<WarehouseStockConnectionInput>> {
  return z.object({
    after: z.string().nullish(),
    before: z.string().nullish(),
    first: z.number().nullish(),
    last: z.number().nullish(),
    orderBy: z.array(z.lazy(() => WarehouseStockOrderByInputSchema())).nullish(),
    where: z.lazy(() => WarehouseStockWhereInputSchema().nullish())
  })
}

export function WarehouseStockCreateInputSchema(): z.ZodObject<Properties<WarehouseStockCreateInput>> {
  return z.object({
    items: z.array(z.lazy(() => WarehouseStockCreateItemInputSchema()))
  })
}

export function WarehouseStockCreateItemInputSchema(): z.ZodObject<Properties<WarehouseStockCreateItemInput>> {
  return z.object({
    variantId: z.string(),
    warehouseId: z.string()
  })
}

export function WarehouseStockDeleteInputSchema(): z.ZodObject<Properties<WarehouseStockDeleteInput>> {
  return z.object({
    items: z.array(z.lazy(() => WarehouseStockDeleteItemInputSchema()))
  })
}

export function WarehouseStockDeleteItemInputSchema(): z.ZodObject<Properties<WarehouseStockDeleteItemInput>> {
  return z.object({
    variantId: z.string(),
    warehouseId: z.string()
  })
}

export function WarehouseStockOrderByInputSchema(): z.ZodObject<Properties<WarehouseStockOrderByInput>> {
  return z.object({
    direction: SortDirectionSchema,
    field: WarehouseStockOrderFieldSchema
  })
}

export function WarehouseStockWhereInputSchema(): z.ZodObject<Properties<WarehouseStockWhereInput>> {
  return z.object({
    _and: z.array(z.lazy(() => WarehouseStockWhereInputSchema())).nullish(),
    _not: z.lazy(() => WarehouseStockWhereInputSchema().nullish()),
    _or: z.array(z.lazy(() => WarehouseStockWhereInputSchema())).nullish(),
    createdAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    id: z.lazy(() => IdFilterSchema().nullish()),
    quantityOnHand: z.lazy(() => IntFilterSchema().nullish()),
    updatedAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    variantId: z.lazy(() => IdFilterSchema().nullish()),
    warehouseId: z.lazy(() => IdFilterSchema().nullish())
  })
}

export function WarehouseUpdateInputSchema(): z.ZodObject<Properties<WarehouseUpdateInput>> {
  return z.object({
    code: z.string().nullish(),
    id: z.string(),
    isDefault: z.boolean().nullish(),
    name: z.string().nullish()
  })
}

export function WarehouseWhereInputSchema(): z.ZodObject<Properties<WarehouseWhereInput>> {
  return z.object({
    _and: z.array(z.lazy(() => WarehouseWhereInputSchema())).nullish(),
    _not: z.lazy(() => WarehouseWhereInputSchema().nullish()),
    _or: z.array(z.lazy(() => WarehouseWhereInputSchema())).nullish(),
    code: z.lazy(() => StringFilterSchema().nullish()),
    createdAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    id: z.lazy(() => IdFilterSchema().nullish()),
    isDefault: z.lazy(() => BooleanFilterSchema().nullish()),
    name: z.lazy(() => StringFilterSchema().nullish()),
    updatedAt: z.lazy(() => DateTimeFilterSchema().nullish())
  })
}

export function WeightInputSchema(): z.ZodObject<Properties<WeightInput>> {
  return z.object({
    value: z.number()
  })
}

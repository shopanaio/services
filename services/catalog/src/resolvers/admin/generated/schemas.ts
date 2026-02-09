import { z } from 'zod'
import { BooleanFilter, BulkUpdateCancelReason, BulkUpdateItemStatus, BulkUpdateJobStatus, BulkUpdateOpType, CategoryCreateInput, CategoryDeleteInput, CategoryMoveInput, CategoryMoveProductInput, CategoryRebalanceInput, CategoryUpdateInput, CategoryUpdateSortInput, CollectionAddProductsInput, CollectionCreateInput, CollectionDeleteInput, CollectionMediaInput, CollectionMoveProductInput, CollectionRemoveProductsInput, CollectionRuleInput, CollectionType, CollectionUpdateInput, CollectionUpdateRulesInput, CurrencyCode, DateTimeFilter, DescriptionInput, DimensionUnit, FacetCreateInput, FacetDeleteInput, FacetGroupCreateInput, FacetGroupDeleteInput, FacetGroupUpdateInput, FacetSelectionMode, FacetSwatchCreateInput, FacetSwatchDeleteInput, FacetSwatchUpdateInput, FacetType, FacetUiType, FacetUpdateInput, FacetValueCreateInput, FacetValueDeleteInput, FacetValueSort, FacetValueUpdateInput, FloatFilter, IdFilter, IntFilter, InventoryItemInput, LocaleCode, OperationType, OptionDisplayType, PricingWidgetInput, ProductBulkUpdateInput, ProductBulkUpdateItem, ProductContentInput, ProductCreateInput, ProductCreateOptionInput, ProductCreateOptionValueInput, ProductCreateVariantInput, ProductDeleteInput, ProductFeatureCreateInput, ProductFeatureDeleteInput, ProductFeatureInput, ProductFeatureSyncItemInput, ProductFeatureUpdateInput, ProductFeatureValueCreateInput, ProductFeatureValueSyncInput, ProductFeatureValueUpdateInput, ProductFeatureValuesInput, ProductFeaturesSyncInput, ProductMediaInput, ProductOptionCreateInput, ProductOptionDeleteInput, ProductOptionSwatchInput, ProductOptionSyncItemInput, ProductOptionUpdateInput, ProductOptionValueCreateInput, ProductOptionValueSyncInput, ProductOptionValueUpdateInput, ProductOptionValuesInput, ProductOptionsSyncInput, ProductSeoInput, ProductSortBy, ProductSortInput, ProductStatus, ProductStatusAction, ProductUpdateInput, ProductUpdateStatusInput, SelectedOptionInput, SeoInput, SortDirection, StringFilter, SwatchType, TagCreateInput, TagDeleteInput, TagUpdateInput, VariantCreateInput, VariantDeleteInput, VariantDimensionsOpInput, VariantInput, VariantInventoryOpInput, VariantMediaOpInput, VariantOptionLinkInput, VariantOptionsOpInput, VariantPricingOpInput, VariantUpdateInput, VariantUpdateMediaInput, VariantUpdateOptionsInput, VariantUpdatePricingInput, WeightUnit } from './types.js'

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

export const CollectionTypeSchema = z.nativeEnum(CollectionType);

export const CurrencyCodeSchema = z.nativeEnum(CurrencyCode);

export const DimensionUnitSchema = z.nativeEnum(DimensionUnit);

export const FacetSelectionModeSchema = z.nativeEnum(FacetSelectionMode);

export const FacetTypeSchema = z.nativeEnum(FacetType);

export const FacetUiTypeSchema = z.nativeEnum(FacetUiType);

export const FacetValueSortSchema = z.nativeEnum(FacetValueSort);

export const LocaleCodeSchema = z.nativeEnum(LocaleCode);

export const OperationTypeSchema = z.nativeEnum(OperationType);

export const OptionDisplayTypeSchema = z.nativeEnum(OptionDisplayType);

export const ProductSortBySchema = z.nativeEnum(ProductSortBy);

export const ProductStatusSchema = z.nativeEnum(ProductStatus);

export const ProductStatusActionSchema = z.nativeEnum(ProductStatusAction);

export const SortDirectionSchema = z.nativeEnum(SortDirection);

export const SwatchTypeSchema = z.nativeEnum(SwatchType);

export const WeightUnitSchema = z.nativeEnum(WeightUnit);

export function BooleanFilterSchema(): z.ZodObject<Properties<BooleanFilter>> {
  return z.object({
    _eq: z.boolean().nullish(),
    _is: z.boolean().nullish(),
    _isNot: z.boolean().nullish(),
    _neq: z.boolean().nullish()
  })
}

export function CategoryCreateInputSchema(): z.ZodObject<Properties<CategoryCreateInput>> {
  return z.object({
    description: z.lazy(() => DescriptionInputSchema().nullish()),
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

export function CategoryMoveInputSchema(): z.ZodObject<Properties<CategoryMoveInput>> {
  return z.object({
    id: z.string(),
    newParentId: z.string().nullish()
  })
}

export function CategoryMoveProductInputSchema(): z.ZodObject<Properties<CategoryMoveProductInput>> {
  return z.object({
    afterProductId: z.string().nullish(),
    beforeProductId: z.string().nullish(),
    categoryId: z.string(),
    productId: z.string()
  })
}

export function CategoryRebalanceInputSchema(): z.ZodObject<Properties<CategoryRebalanceInput>> {
  return z.object({
    categoryId: z.string()
  })
}

export function CategoryUpdateInputSchema(): z.ZodObject<Properties<CategoryUpdateInput>> {
  return z.object({
    description: z.lazy(() => DescriptionInputSchema().nullish()),
    handle: z.string().nullish(),
    id: z.string(),
    mediaFileIds: z.array(z.string()).nullish(),
    name: z.string().nullish(),
    seo: z.lazy(() => SeoInputSchema().nullish())
  })
}

export function CategoryUpdateSortInputSchema(): z.ZodObject<Properties<CategoryUpdateSortInput>> {
  return z.object({
    defaultSort: ProductSortBySchema,
    defaultSortDirection: SortDirectionSchema,
    id: z.string()
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
    description: z.lazy(() => DescriptionInputSchema().nullish()),
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
    description: z.lazy(() => DescriptionInputSchema().nullish()),
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

export function DescriptionInputSchema(): z.ZodObject<Properties<DescriptionInput>> {
  return z.object({
    html: z.string(),
    json: z.record(z.unknown()),
    text: z.string()
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

export function InventoryItemInputSchema(): z.ZodObject<Properties<InventoryItemInput>> {
  return z.object({
    continueSellingWhenOutOfStock: z.boolean().nullish(),
    sku: z.string().nullish(),
    tracked: z.boolean()
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

export function ProductContentInputSchema(): z.ZodObject<Properties<ProductContentInput>> {
  return z.object({
    description: z.lazy(() => DescriptionInputSchema().nullish()),
    excerpt: z.string().nullish()
  })
}

export function ProductCreateInputSchema(): z.ZodObject<Properties<ProductCreateInput>> {
  return z.object({
    description: z.lazy(() => DescriptionInputSchema().nullish()),
    handle: z.string(),
    inventoryItem: z.lazy(() => InventoryItemInputSchema().nullish()),
    mediaFileIds: z.array(z.string()).nullish(),
    options: z.array(z.lazy(() => ProductCreateOptionInputSchema())).nullish(),
    title: z.string(),
    variants: z.array(z.lazy(() => ProductCreateVariantInputSchema())).nullish()
  })
}

export function ProductCreateOptionInputSchema(): z.ZodObject<Properties<ProductCreateOptionInput>> {
  return z.object({
    displayType: z.string().nullish(),
    name: z.string(),
    slug: z.string(),
    values: z.array(z.lazy(() => ProductCreateOptionValueInputSchema()))
  })
}

export function ProductCreateOptionValueInputSchema(): z.ZodObject<Properties<ProductCreateOptionValueInput>> {
  return z.object({
    name: z.string(),
    slug: z.string()
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
    index: z.number(),
    name: z.string(),
    slug: z.string(),
    values: z.array(z.lazy(() => ProductOptionValueSyncInputSchema()))
  })
}

export function ProductOptionUpdateInputSchema(): z.ZodObject<Properties<ProductOptionUpdateInput>> {
  return z.object({
    displayType: OptionDisplayTypeSchema.nullish(),
    id: z.string(),
    name: z.string().nullish(),
    slug: z.string().nullish(),
    values: z.lazy(() => ProductOptionValuesInputSchema().nullish())
  })
}

export function ProductOptionValueCreateInputSchema(): z.ZodObject<Properties<ProductOptionValueCreateInput>> {
  return z.object({
    name: z.string(),
    slug: z.string(),
    swatch: z.lazy(() => ProductOptionSwatchInputSchema().nullish())
  })
}

export function ProductOptionValueSyncInputSchema(): z.ZodObject<Properties<ProductOptionValueSyncInput>> {
  return z.object({
    id: z.string().nullish(),
    index: z.number(),
    name: z.string(),
    slug: z.string(),
    swatch: z.lazy(() => ProductOptionSwatchInputSchema().nullish())
  })
}

export function ProductOptionValueUpdateInputSchema(): z.ZodObject<Properties<ProductOptionValueUpdateInput>> {
  return z.object({
    id: z.string(),
    name: z.string().nullish(),
    slug: z.string().nullish(),
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

export function ProductUpdateInputSchema(): z.ZodObject<Properties<ProductUpdateInput>> {
  return z.object({
    content: z.lazy(() => ProductContentInputSchema().nullish()),
    handle: z.string().nullish(),
    media: z.lazy(() => ProductMediaInputSchema().nullish()),
    seo: z.lazy(() => ProductSeoInputSchema().nullish()),
    status: ProductStatusSchema.nullish(),
    title: z.string().nullish(),
    variants: z.array(z.lazy(() => VariantUpdateInputSchema())).nullish()
  })
}

export function ProductUpdateStatusInputSchema(): z.ZodObject<Properties<ProductUpdateStatusInput>> {
  return z.object({
    action: ProductStatusActionSchema,
    productId: z.string()
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

export function TagUpdateInputSchema(): z.ZodObject<Properties<TagUpdateInput>> {
  return z.object({
    handle: z.string().nullish(),
    id: z.string(),
    name: z.string().nullish()
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
    warehouseId: z.string(),
    weight: z.number().nullish()
  })
}

export function VariantMediaOpInputSchema(): z.ZodObject<Properties<VariantMediaOpInput>> {
  return z.object({
    fileIds: z.array(z.string())
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

export function VariantPricingOpInputSchema(): z.ZodObject<Properties<VariantPricingOpInput>> {
  return z.object({
    amountMinor: z.string(),
    compareAtMinor: z.string().nullish(),
    currency: CurrencyCodeSchema
  })
}

export function VariantUpdateInputSchema(): z.ZodObject<Properties<VariantUpdateInput>> {
  return z.object({
    dimensions: z.lazy(() => VariantDimensionsOpInputSchema().nullish()),
    inventory: z.lazy(() => VariantInventoryOpInputSchema().nullish()),
    media: z.lazy(() => VariantMediaOpInputSchema().nullish()),
    options: z.lazy(() => VariantOptionsOpInputSchema().nullish()),
    pricing: z.lazy(() => VariantPricingOpInputSchema().nullish()),
    variantId: z.string()
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

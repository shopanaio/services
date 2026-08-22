import { z } from 'zod'
import { BooleanFilter, BulkUpdateCancelReason, BulkUpdateItemStatus, BulkUpdateItemWhereInput, BulkUpdateJobStatus, BulkUpdateOpType, CatalogOperationType, CategoryCategoriesMetaInput, CategoryComparisonProfileOperationAction, CategoryComparisonProfileOperationInput, CategoryContentInput, CategoryCreateInput, CategoryFieldsInput, CategoryHierarchyOperationAction, CategoryHierarchyOperationInput, CategoryHierarchyScopeDirection, CategoryHierarchyScopeInput, CategoryHierarchyScopeMode, CategoryMediaInput, CategoryOrderByInput, CategoryOrderField, CategoryProductsScopeInput, CategorySortInput, CategoryStatus, CategoryUpdateInput, CategoryWhereInput, CollectionAttributeRuleValueInput, CollectionCategoryRuleInput, CollectionComparisonRuleOperator, CollectionCreateInput, CollectionCreatedAtComparisonRuleInput, CollectionCreatedAtRangeRuleInput, CollectionFeatureRuleInput, CollectionFieldsInput, CollectionInStockRuleInput, CollectionMediaInput, CollectionOptionRuleInput, CollectionPriceComparisonRuleInput, CollectionPriceRangeRuleInput, CollectionProductOperationAction, CollectionProductOperationInput, CollectionRuleField, CollectionRuleInput, CollectionRuleReferenceStatus, CollectionRulesOperationAction, CollectionRulesOperationInput, CollectionRulesPreviewCountInput, CollectionSetRuleOperator, CollectionTagRuleInput, CollectionType, CollectionUpdateInput, CollectionVendorRuleInput, ComparisonCardinality, ComparisonFieldCreateInput, ComparisonFieldInput, ComparisonFieldOptionCreateInput, ComparisonFieldOptionInput, ComparisonGroupCreateInput, ComparisonGroupInput, ComparisonProfileCreateInput, ComparisonProfileDefinitionInput, ComparisonProfileOrderByInput, ComparisonProfileOrderField, ComparisonProfileUpdateInput, ComparisonProfileWhereInput, ComparisonValueType, CurrencyCode, DateTimeFilter, DimensionUnit, DimensionsInput, FacetSourceCandidateOrderByInput, FacetSourceCandidateOrderField, FacetSourceCandidateWhereInput, FacetValueCandidateOrderByInput, FacetValueCandidateOrderField, FacetValueCandidateWhereInput, FloatFilter, IdFilter, IntFilter, InventoryItemCostInput, InventoryItemInput, InventoryItemInventoryItemsMetaInput, InventoryItemOrderByInput, InventoryItemOrderField, InventoryItemStockInput, InventoryItemUpdateInput, InventoryItemWarehouseScopeInput, InventoryItemWarehouseScopeMode, InventoryItemWhereInput, InventoryWidgetInput, LocaleCode, PriceAdjustmentOperation, PriceAdjustmentValueType, PricingWidgetInput, ProductBulkUpdateInput, ProductBulkUpdateItem, ProductBulkUpdateJobWhereInput, ProductCategoriesScopeInput, ProductCategoryOperationAction, ProductCategoryOperationInput, ProductComparisonCompatibilityStatus, ProductComparisonConfigurationOperationAction, ProductComparisonConfigurationOperationInput, ProductComparisonFeatureMappingInput, ProductComparisonFeatureValueMappingInput, ProductComparisonFieldMappingInput, ProductComparisonNormalizedValueInput, ProductComparisonNotApplicableInput, ProductComparisonOptionMappingInput, ProductComparisonOptionValueMappingInput, ProductComparisonSourceKind, ProductComponentConditionCategory, ProductComponentConditionGroupSyncItemInput, ProductComponentConditionOperator, ProductComponentConditionSubject, ProductComponentConditionSyncItemInput, ProductComponentDependencyActionSyncItemInput, ProductComponentDependencyActionType, ProductComponentDependencyRuleSyncItemInput, ProductComponentDependencyTargetType, ProductComponentDisplayStyle, ProductComponentGroupSyncItemInput, ProductComponentItemOptionSelectionSyncItemInput, ProductComponentItemOptionValueSelectionStatus, ProductComponentItemOptionValueSelectionSyncItemInput, ProductComponentItemSyncItemInput, ProductComponentItemType, ProductComponentLogicOperator, ProductComponentOperationAction, ProductComponentOperationInput, ProductComponentPriceRuleAmountInput, ProductComponentPriceRuleInput, ProductComponentPriceStrategy, ProductComponentPricingTemplateSyncItemInput, ProductContentInput, ProductCreateInput, ProductCreateOptionInput, ProductCreateOptionValueInput, ProductCreateVariantInput, ProductFeatureCreateInput, ProductFeatureDeleteInput, ProductFeatureInput, ProductFeatureSyncItemInput, ProductFeatureUpdateInput, ProductFeatureValueCreateInput, ProductFeatureValueSyncInput, ProductFeatureValueUpdateInput, ProductFeatureValuesInput, ProductFeaturesSyncInput, ProductMediaInput, ProductOptionCategoryCreateInput, ProductOptionCategoryOrderByInput, ProductOptionCategoryOrderField, ProductOptionCategoryUpdateInput, ProductOptionCategoryWhereInput, ProductOptionCreateInput, ProductOptionDeleteInput, ProductOptionSwatchInput, ProductOptionSyncItemInput, ProductOptionUpdateInput, ProductOptionValueCreateInput, ProductOptionValueSyncInput, ProductOptionValueUpdateInput, ProductOptionValuesInput, ProductOptionsSyncInput, ProductOrderByInput, ProductOrderField, ProductProductsMetaInput, ProductSeoInput, ProductSortBy, ProductSortInput, ProductStatus, ProductStatusAction, ProductTagOperationAction, ProductTagOperationInput, ProductUpdateInput, ProductWhereInput, RichTextInput, SelectedOptionInput, SeoInput, SortDirection, StringFilter, SwatchType, TagCreateInput, TagOrderByInput, TagOrderField, TagUpdateInput, TagWhereInput, ThresholdMethod, VariantCreateInput, VariantDeleteInput, VariantDimensionsOpInput, VariantInput, VariantInventoryOpInput, VariantMediaOpInput, VariantOperationAction, VariantOperationInput, VariantOptionLinkInput, VariantOptionsOpInput, VariantOrderByInput, VariantOrderField, VariantPricingOpInput, VariantUpdateMediaInput, VariantUpdateOptionsInput, VariantUpdatePricingInput, VariantWhereInput, VendorCreateInput, VendorOrderByInput, VendorOrderField, VendorUpdateInput, VendorWhereInput, WarehouseAssignableVariantOrderByInput, WarehouseAssignableVariantOrderField, WarehouseAssignableVariantWhereInput, WarehouseBulkUpdateInput, WarehouseBulkUpdateItemInput, WarehouseConnectionInput, WarehouseCreateInput, WarehouseOrderByInput, WarehouseOrderField, WarehouseStockConnectionInput, WarehouseStockOperationAction, WarehouseStockOperationInput, WarehouseStockOrderByInput, WarehouseStockOrderField, WarehouseStockWhereInput, WarehouseUpdateInput, WarehouseWhereInput, WeightInput, WeightUnit } from './types.js'

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

export const CatalogOperationTypeSchema = z.nativeEnum(CatalogOperationType);

export const CategoryComparisonProfileOperationActionSchema = z.nativeEnum(CategoryComparisonProfileOperationAction);

export const CategoryHierarchyOperationActionSchema = z.nativeEnum(CategoryHierarchyOperationAction);

export const CategoryHierarchyScopeDirectionSchema = z.nativeEnum(CategoryHierarchyScopeDirection);

export const CategoryHierarchyScopeModeSchema = z.nativeEnum(CategoryHierarchyScopeMode);

export const CategoryOrderFieldSchema = z.nativeEnum(CategoryOrderField);

export const CategoryStatusSchema = z.nativeEnum(CategoryStatus);

export const CollectionComparisonRuleOperatorSchema = z.nativeEnum(CollectionComparisonRuleOperator);

export const CollectionProductOperationActionSchema = z.nativeEnum(CollectionProductOperationAction);

export const CollectionRuleFieldSchema = z.nativeEnum(CollectionRuleField);

export const CollectionRuleReferenceStatusSchema = z.nativeEnum(CollectionRuleReferenceStatus);

export const CollectionRulesOperationActionSchema = z.nativeEnum(CollectionRulesOperationAction);

export const CollectionSetRuleOperatorSchema = z.nativeEnum(CollectionSetRuleOperator);

export const CollectionTypeSchema = z.nativeEnum(CollectionType);

export const ComparisonCardinalitySchema = z.nativeEnum(ComparisonCardinality);

export const ComparisonProfileOrderFieldSchema = z.nativeEnum(ComparisonProfileOrderField);

export const ComparisonValueTypeSchema = z.nativeEnum(ComparisonValueType);

export const CurrencyCodeSchema = z.nativeEnum(CurrencyCode);

export const DimensionUnitSchema = z.nativeEnum(DimensionUnit);

export const FacetSourceCandidateOrderFieldSchema = z.nativeEnum(FacetSourceCandidateOrderField);

export const FacetValueCandidateOrderFieldSchema = z.nativeEnum(FacetValueCandidateOrderField);

export const InventoryItemOrderFieldSchema = z.nativeEnum(InventoryItemOrderField);

export const InventoryItemWarehouseScopeModeSchema = z.nativeEnum(InventoryItemWarehouseScopeMode);

export const LocaleCodeSchema = z.nativeEnum(LocaleCode);

export const PriceAdjustmentOperationSchema = z.nativeEnum(PriceAdjustmentOperation);

export const PriceAdjustmentValueTypeSchema = z.nativeEnum(PriceAdjustmentValueType);

export const ProductCategoryOperationActionSchema = z.nativeEnum(ProductCategoryOperationAction);

export const ProductComparisonCompatibilityStatusSchema = z.nativeEnum(ProductComparisonCompatibilityStatus);

export const ProductComparisonConfigurationOperationActionSchema = z.nativeEnum(ProductComparisonConfigurationOperationAction);

export const ProductComparisonSourceKindSchema = z.nativeEnum(ProductComparisonSourceKind);

export const ProductComponentConditionCategorySchema = z.nativeEnum(ProductComponentConditionCategory);

export const ProductComponentConditionOperatorSchema = z.nativeEnum(ProductComponentConditionOperator);

export const ProductComponentConditionSubjectSchema = z.nativeEnum(ProductComponentConditionSubject);

export const ProductComponentDependencyActionTypeSchema = z.nativeEnum(ProductComponentDependencyActionType);

export const ProductComponentDependencyTargetTypeSchema = z.nativeEnum(ProductComponentDependencyTargetType);

export const ProductComponentDisplayStyleSchema = z.nativeEnum(ProductComponentDisplayStyle);

export const ProductComponentItemOptionValueSelectionStatusSchema = z.nativeEnum(ProductComponentItemOptionValueSelectionStatus);

export const ProductComponentItemTypeSchema = z.nativeEnum(ProductComponentItemType);

export const ProductComponentLogicOperatorSchema = z.nativeEnum(ProductComponentLogicOperator);

export const ProductComponentOperationActionSchema = z.nativeEnum(ProductComponentOperationAction);

export const ProductComponentPriceStrategySchema = z.nativeEnum(ProductComponentPriceStrategy);

export const ProductOptionCategoryOrderFieldSchema = z.nativeEnum(ProductOptionCategoryOrderField);

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

export const WarehouseStockOperationActionSchema = z.nativeEnum(WarehouseStockOperationAction);

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

export function BulkUpdateItemWhereInputSchema(): z.ZodObject<Properties<BulkUpdateItemWhereInput>> {
  return z.object({
    status: z.array(BulkUpdateItemStatusSchema).nullish()
  })
}

export function CategoryCategoriesMetaInputSchema(): z.ZodObject<Properties<CategoryCategoriesMetaInput>> {
  return z.object({
    hierarchyScope: z.lazy(() => CategoryHierarchyScopeInputSchema().nullish()),
    productsScope: z.lazy(() => CategoryProductsScopeInputSchema().nullish())
  })
}

export function CategoryComparisonProfileOperationInputSchema(): z.ZodObject<Properties<CategoryComparisonProfileOperationInput>> {
  return z.object({
    action: CategoryComparisonProfileOperationActionSchema,
    profileId: z.string().nullish()
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

export function CategoryFieldsInputSchema(): z.ZodObject<Properties<CategoryFieldsInput>> {
  return z.object({
    content: z.lazy(() => CategoryContentInputSchema().nullish()),
    handle: z.string().nullish(),
    media: z.lazy(() => CategoryMediaInputSchema().nullish()),
    name: z.string().nullish(),
    seo: z.lazy(() => SeoInputSchema().nullish()),
    sort: z.lazy(() => CategorySortInputSchema().nullish()),
    status: CategoryStatusSchema.nullish()
  })
}

export function CategoryHierarchyOperationInputSchema(): z.ZodObject<Properties<CategoryHierarchyOperationInput>> {
  return z.object({
    action: CategoryHierarchyOperationActionSchema,
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

export function CategoryOrderByInputSchema(): z.ZodObject<Properties<CategoryOrderByInput>> {
  return z.object({
    direction: SortDirectionSchema,
    field: CategoryOrderFieldSchema
  })
}

export function CategoryProductsScopeInputSchema(): z.ZodObject<Properties<CategoryProductsScopeInput>> {
  return z.object({
    mode: CategoryHierarchyScopeModeSchema,
    referenceIds: z.array(z.string())
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
    comparisonProfile: z.array(z.lazy(() => CategoryComparisonProfileOperationInputSchema())).nullish(),
    fields: z.lazy(() => CategoryFieldsInputSchema().nullish()),
    hierarchy: z.array(z.lazy(() => CategoryHierarchyOperationInputSchema())).nullish()
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

export function CollectionAttributeRuleValueInputSchema(): z.ZodObject<Properties<CollectionAttributeRuleValueInput>> {
  return z.object({
    sourceHandle: z.string(),
    valueHandle: z.string()
  })
}

export function CollectionCategoryRuleInputSchema(): z.ZodObject<Properties<CollectionCategoryRuleInput>> {
  return z.object({
    categoryIds: z.array(z.string()),
    operator: CollectionSetRuleOperatorSchema
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
    handle: z.string(),
    media: z.array(z.lazy(() => CollectionMediaInputSchema())).nullish(),
    name: z.string(),
    publish: z.boolean().nullish(),
    seo: z.lazy(() => SeoInputSchema().nullish()),
    type: CollectionTypeSchema
  })
}

export function CollectionCreatedAtComparisonRuleInputSchema(): z.ZodObject<Properties<CollectionCreatedAtComparisonRuleInput>> {
  return z.object({
    instant: z.string(),
    operator: CollectionComparisonRuleOperatorSchema
  })
}

export function CollectionCreatedAtRangeRuleInputSchema(): z.ZodObject<Properties<CollectionCreatedAtRangeRuleInput>> {
  return z.object({
    from: z.string(),
    to: z.string()
  })
}

export function CollectionFeatureRuleInputSchema(): z.ZodObject<Properties<CollectionFeatureRuleInput>> {
  return z.object({
    operator: CollectionSetRuleOperatorSchema,
    values: z.array(z.lazy(() => CollectionAttributeRuleValueInputSchema()))
  })
}

export function CollectionFieldsInputSchema(): z.ZodObject<Properties<CollectionFieldsInput>> {
  return z.object({
    activeFrom: z.string().nullish(),
    activeTo: z.string().nullish(),
    defaultSort: ProductSortBySchema.nullish(),
    defaultSortDirection: SortDirectionSchema.nullish(),
    description: z.lazy(() => RichTextInputSchema().nullish()),
    excerpt: z.lazy(() => RichTextInputSchema().nullish()),
    handle: z.string().nullish(),
    media: z.array(z.lazy(() => CollectionMediaInputSchema())).nullish(),
    name: z.string().nullish(),
    publish: z.boolean().nullish(),
    seo: z.lazy(() => SeoInputSchema().nullish())
  })
}

export function CollectionInStockRuleInputSchema(): z.ZodObject<Properties<CollectionInStockRuleInput>> {
  return z.object({
    value: z.boolean()
  })
}

export function CollectionMediaInputSchema(): z.ZodObject<Properties<CollectionMediaInput>> {
  return z.object({
    fileId: z.string()
  })
}

export function CollectionOptionRuleInputSchema(): z.ZodObject<Properties<CollectionOptionRuleInput>> {
  return z.object({
    operator: CollectionSetRuleOperatorSchema,
    values: z.array(z.lazy(() => CollectionAttributeRuleValueInputSchema()))
  })
}

export function CollectionPriceComparisonRuleInputSchema(): z.ZodObject<Properties<CollectionPriceComparisonRuleInput>> {
  return z.object({
    amountMinor: z.string(),
    currencyCode: CurrencyCodeSchema,
    operator: CollectionComparisonRuleOperatorSchema
  })
}

export function CollectionPriceRangeRuleInputSchema(): z.ZodObject<Properties<CollectionPriceRangeRuleInput>> {
  return z.object({
    currencyCode: CurrencyCodeSchema,
    maxAmountMinor: z.string(),
    minAmountMinor: z.string()
  })
}

export function CollectionProductOperationInputSchema(): z.ZodObject<Properties<CollectionProductOperationInput>> {
  return z.object({
    action: CollectionProductOperationActionSchema,
    afterProductId: z.string().nullish(),
    beforeProductId: z.string().nullish(),
    productId: z.string().nullish()
  })
}

export function CollectionRuleInputSchema(): z.ZodObject<Properties<CollectionRuleInput>> {
  return z.object({
    category: z.lazy(() => CollectionCategoryRuleInputSchema().nullish()),
    createdAtComparison: z.lazy(() => CollectionCreatedAtComparisonRuleInputSchema().nullish()),
    createdAtRange: z.lazy(() => CollectionCreatedAtRangeRuleInputSchema().nullish()),
    feature: z.lazy(() => CollectionFeatureRuleInputSchema().nullish()),
    inStock: z.lazy(() => CollectionInStockRuleInputSchema().nullish()),
    option: z.lazy(() => CollectionOptionRuleInputSchema().nullish()),
    priceComparison: z.lazy(() => CollectionPriceComparisonRuleInputSchema().nullish()),
    priceRange: z.lazy(() => CollectionPriceRangeRuleInputSchema().nullish()),
    tag: z.lazy(() => CollectionTagRuleInputSchema().nullish()),
    vendor: z.lazy(() => CollectionVendorRuleInputSchema().nullish())
  })
}

export function CollectionRulesOperationInputSchema(): z.ZodObject<Properties<CollectionRulesOperationInput>> {
  return z.object({
    action: CollectionRulesOperationActionSchema,
    rules: z.array(z.lazy(() => CollectionRuleInputSchema()))
  })
}

export function CollectionRulesPreviewCountInputSchema(): z.ZodObject<Properties<CollectionRulesPreviewCountInput>> {
  return z.object({
    rules: z.array(z.lazy(() => CollectionRuleInputSchema()))
  })
}

export function CollectionTagRuleInputSchema(): z.ZodObject<Properties<CollectionTagRuleInput>> {
  return z.object({
    operator: CollectionSetRuleOperatorSchema,
    tagIds: z.array(z.string())
  })
}

export function CollectionUpdateInputSchema(): z.ZodObject<Properties<CollectionUpdateInput>> {
  return z.object({
    fields: z.lazy(() => CollectionFieldsInputSchema().nullish()),
    products: z.array(z.lazy(() => CollectionProductOperationInputSchema())).nullish(),
    rules: z.array(z.lazy(() => CollectionRulesOperationInputSchema())).nullish()
  })
}

export function CollectionVendorRuleInputSchema(): z.ZodObject<Properties<CollectionVendorRuleInput>> {
  return z.object({
    vendorIds: z.array(z.string())
  })
}

export function ComparisonFieldCreateInputSchema(): z.ZodObject<Properties<ComparisonFieldCreateInput>> {
  return z.object({
    canonicalUnit: z.string().nullish(),
    cardinality: ComparisonCardinalitySchema,
    description: z.string().nullish(),
    featured: z.boolean().default(false).nullish(),
    handle: z.string(),
    name: z.string(),
    options: z.array(z.lazy(() => ComparisonFieldOptionCreateInputSchema())),
    sortIndex: z.number(),
    valueType: ComparisonValueTypeSchema
  })
}

export function ComparisonFieldInputSchema(): z.ZodObject<Properties<ComparisonFieldInput>> {
  return z.object({
    canonicalUnit: z.string().nullish(),
    cardinality: ComparisonCardinalitySchema,
    description: z.string().nullish(),
    featured: z.boolean().default(false).nullish(),
    handle: z.string(),
    id: z.string().nullish(),
    name: z.string(),
    options: z.array(z.lazy(() => ComparisonFieldOptionInputSchema())),
    sortIndex: z.number(),
    valueType: ComparisonValueTypeSchema
  })
}

export function ComparisonFieldOptionCreateInputSchema(): z.ZodObject<Properties<ComparisonFieldOptionCreateInput>> {
  return z.object({
    handle: z.string(),
    name: z.string(),
    sortIndex: z.number()
  })
}

export function ComparisonFieldOptionInputSchema(): z.ZodObject<Properties<ComparisonFieldOptionInput>> {
  return z.object({
    handle: z.string(),
    id: z.string().nullish(),
    name: z.string(),
    sortIndex: z.number()
  })
}

export function ComparisonGroupCreateInputSchema(): z.ZodObject<Properties<ComparisonGroupCreateInput>> {
  return z.object({
    fields: z.array(z.lazy(() => ComparisonFieldCreateInputSchema())),
    handle: z.string(),
    name: z.string(),
    sortIndex: z.number()
  })
}

export function ComparisonGroupInputSchema(): z.ZodObject<Properties<ComparisonGroupInput>> {
  return z.object({
    fields: z.array(z.lazy(() => ComparisonFieldInputSchema())),
    handle: z.string(),
    id: z.string().nullish(),
    name: z.string(),
    sortIndex: z.number()
  })
}

export function ComparisonProfileCreateInputSchema(): z.ZodObject<Properties<ComparisonProfileCreateInput>> {
  return z.object({
    enabled: z.boolean().default(true).nullish(),
    groups: z.array(z.lazy(() => ComparisonGroupCreateInputSchema())),
    handle: z.string(),
    missingLabel: z.string(),
    name: z.string(),
    notApplicableLabel: z.string(),
    unavailableLabel: z.string()
  })
}

export function ComparisonProfileDefinitionInputSchema(): z.ZodObject<Properties<ComparisonProfileDefinitionInput>> {
  return z.object({
    enabled: z.boolean(),
    groups: z.array(z.lazy(() => ComparisonGroupInputSchema())),
    handle: z.string(),
    missingLabel: z.string(),
    name: z.string(),
    notApplicableLabel: z.string(),
    unavailableLabel: z.string()
  })
}

export function ComparisonProfileOrderByInputSchema(): z.ZodObject<Properties<ComparisonProfileOrderByInput>> {
  return z.object({
    direction: SortDirectionSchema,
    field: ComparisonProfileOrderFieldSchema
  })
}

export function ComparisonProfileUpdateInputSchema(): z.ZodObject<Properties<ComparisonProfileUpdateInput>> {
  return z.object({
    definition: z.lazy(() => ComparisonProfileDefinitionInputSchema().nullish())
  })
}

export function ComparisonProfileWhereInputSchema(): z.ZodObject<Properties<ComparisonProfileWhereInput>> {
  return z.object({
    enabled: z.boolean().nullish(),
    handle: z.string().nullish()
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

export function FacetSourceCandidateOrderByInputSchema(): z.ZodObject<Properties<FacetSourceCandidateOrderByInput>> {
  return z.object({
    direction: SortDirectionSchema,
    field: FacetSourceCandidateOrderFieldSchema
  })
}

export function FacetSourceCandidateWhereInputSchema(): z.ZodObject<Properties<FacetSourceCandidateWhereInput>> {
  return z.object({
    _and: z.array(z.lazy(() => FacetSourceCandidateWhereInputSchema())).nullish(),
    _not: z.lazy(() => FacetSourceCandidateWhereInputSchema().nullish()),
    _or: z.array(z.lazy(() => FacetSourceCandidateWhereInputSchema())).nullish(),
    facetType: z.lazy(() => StringFilterSchema().nullish()),
    handle: z.lazy(() => StringFilterSchema().nullish()),
    id: z.lazy(() => IdFilterSchema().nullish()),
    name: z.lazy(() => StringFilterSchema().nullish()),
    sortName: z.lazy(() => StringFilterSchema().nullish()),
    sourceSortBucket: z.lazy(() => IntFilterSchema().nullish())
  })
}

export function FacetValueCandidateOrderByInputSchema(): z.ZodObject<Properties<FacetValueCandidateOrderByInput>> {
  return z.object({
    direction: SortDirectionSchema,
    field: FacetValueCandidateOrderFieldSchema
  })
}

export function FacetValueCandidateWhereInputSchema(): z.ZodObject<Properties<FacetValueCandidateWhereInput>> {
  return z.object({
    _and: z.array(z.lazy(() => FacetValueCandidateWhereInputSchema())).nullish(),
    _not: z.lazy(() => FacetValueCandidateWhereInputSchema().nullish()),
    _or: z.array(z.lazy(() => FacetValueCandidateWhereInputSchema())).nullish(),
    handle: z.lazy(() => StringFilterSchema().nullish()),
    id: z.lazy(() => IdFilterSchema().nullish()),
    label: z.lazy(() => StringFilterSchema().nullish())
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
    currency: CurrencyCodeSchema
  })
}

export function InventoryItemInputSchema(): z.ZodObject<Properties<InventoryItemInput>> {
  return z.object({
    continueSellingWhenOutOfStock: z.boolean().nullish(),
    requiresShipping: z.boolean(),
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
    requiresShipping: z.boolean().nullish(),
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

export function InventoryWidgetInputSchema(): z.ZodObject<Properties<InventoryWidgetInput>> {
  return z.object({
    productId: z.string()
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
    operations: z.lazy(() => ProductUpdateInputSchema()),
    productId: z.string()
  })
}

export function ProductBulkUpdateJobWhereInputSchema(): z.ZodObject<Properties<ProductBulkUpdateJobWhereInput>> {
  return z.object({
    status: z.array(BulkUpdateJobStatusSchema).nullish()
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

export function ProductComparisonConfigurationOperationInputSchema(): z.ZodObject<Properties<ProductComparisonConfigurationOperationInput>> {
  return z.object({
    action: ProductComparisonConfigurationOperationActionSchema,
    mappings: z.array(z.lazy(() => ProductComparisonFieldMappingInputSchema())),
    profileId: z.string()
  })
}

export function ProductComparisonFeatureMappingInputSchema(): z.ZodObject<Properties<ProductComparisonFeatureMappingInput>> {
  return z.object({
    featureId: z.string(),
    values: z.array(z.lazy(() => ProductComparisonFeatureValueMappingInputSchema()))
  })
}

export function ProductComparisonFeatureValueMappingInputSchema(): z.ZodObject<Properties<ProductComparisonFeatureValueMappingInput>> {
  return z.object({
    value: z.lazy(() => ProductComparisonNormalizedValueInputSchema()),
    valueId: z.string()
  })
}

export function ProductComparisonFieldMappingInputSchema(): z.ZodObject<Properties<ProductComparisonFieldMappingInput>> {
  return z.object({
    feature: z.lazy(() => ProductComparisonFeatureMappingInputSchema().nullish()),
    fieldId: z.string(),
    notApplicable: z.lazy(() => ProductComparisonNotApplicableInputSchema().nullish()),
    option: z.lazy(() => ProductComparisonOptionMappingInputSchema().nullish())
  })
}

export function ProductComparisonNormalizedValueInputSchema(): z.ZodObject<Properties<ProductComparisonNormalizedValueInput>> {
  return z.object({
    booleanValue: z.boolean().nullish(),
    decimalValue: z.string().nullish(),
    fieldOptionId: z.string().nullish(),
    integerValue: z.string().nullish(),
    textValue: z.string().nullish()
  })
}

export function ProductComparisonNotApplicableInputSchema(): z.ZodObject<Properties<ProductComparisonNotApplicableInput>> {
  return z.object({
    reason: z.string().nullish()
  })
}

export function ProductComparisonOptionMappingInputSchema(): z.ZodObject<Properties<ProductComparisonOptionMappingInput>> {
  return z.object({
    optionId: z.string(),
    values: z.array(z.lazy(() => ProductComparisonOptionValueMappingInputSchema()))
  })
}

export function ProductComparisonOptionValueMappingInputSchema(): z.ZodObject<Properties<ProductComparisonOptionValueMappingInput>> {
  return z.object({
    value: z.lazy(() => ProductComparisonNormalizedValueInputSchema()),
    valueId: z.string()
  })
}

export function ProductComponentConditionGroupSyncItemInputSchema(): z.ZodObject<Properties<ProductComponentConditionGroupSyncItemInput>> {
  return z.object({
    conditions: z.array(z.lazy(() => ProductComponentConditionSyncItemInputSchema())),
    id: z.string().nullish(),
    logicOperator: ProductComponentLogicOperatorSchema,
    sortIndex: z.number()
  })
}

export function ProductComponentConditionSyncItemInputSchema(): z.ZodObject<Properties<ProductComponentConditionSyncItemInput>> {
  return z.object({
    category: ProductComponentConditionCategorySchema,
    id: z.string().nullish(),
    operator: ProductComponentConditionOperatorSchema,
    sortIndex: z.number(),
    subject: ProductComponentConditionSubjectSchema,
    targetId: z.string(),
    targetType: ProductComponentDependencyTargetTypeSchema,
    value: z.number().nullish()
  })
}

export function ProductComponentDependencyActionSyncItemInputSchema(): z.ZodObject<Properties<ProductComponentDependencyActionSyncItemInput>> {
  return z.object({
    actionType: ProductComponentDependencyActionTypeSchema,
    id: z.string().nullish(),
    priceRule: z.lazy(() => ProductComponentPriceRuleInputSchema().nullish()),
    requiredValue: z.boolean().nullish(),
    sortIndex: z.number(),
    stackable: z.boolean(),
    targetId: z.string(),
    targetType: ProductComponentDependencyTargetTypeSchema
  })
}

export function ProductComponentDependencyRuleSyncItemInputSchema(): z.ZodObject<Properties<ProductComponentDependencyRuleSyncItemInput>> {
  return z.object({
    actions: z.array(z.lazy(() => ProductComponentDependencyActionSyncItemInputSchema())),
    conditionGroups: z.array(z.lazy(() => ProductComponentConditionGroupSyncItemInputSchema())),
    enabled: z.boolean(),
    id: z.string().nullish(),
    logicOperator: ProductComponentLogicOperatorSchema,
    name: z.string(),
    priority: z.number()
  })
}

export function ProductComponentGroupSyncItemInputSchema(): z.ZodObject<Properties<ProductComponentGroupSyncItemInput>> {
  return z.object({
    id: z.string().nullish(),
    items: z.array(z.lazy(() => ProductComponentItemSyncItemInputSchema())),
    maxSelection: z.number().nullish(),
    minSelection: z.number().nullish(),
    sortIndex: z.number(),
    title: z.string()
  })
}

export function ProductComponentItemOptionSelectionSyncItemInputSchema(): z.ZodObject<Properties<ProductComponentItemOptionSelectionSyncItemInput>> {
  return z.object({
    id: z.string().nullish(),
    optionId: z.string(),
    parentOptionId: z.string().nullish(),
    sortIndex: z.number(),
    values: z.array(z.lazy(() => ProductComponentItemOptionValueSelectionSyncItemInputSchema()))
  })
}

export function ProductComponentItemOptionValueSelectionSyncItemInputSchema(): z.ZodObject<Properties<ProductComponentItemOptionValueSelectionSyncItemInput>> {
  return z.object({
    id: z.string().nullish(),
    optionValueId: z.string().nullish(),
    sortIndex: z.number(),
    status: ProductComponentItemOptionValueSelectionStatusSchema,
    value: z.string()
  })
}

export function ProductComponentItemSyncItemInputSchema(): z.ZodObject<Properties<ProductComponentItemSyncItemInput>> {
  return z.object({
    defaultQty: z.number().nullish(),
    featuredImageId: z.string().nullish(),
    id: z.string().nullish(),
    itemType: ProductComponentItemTypeSchema,
    maxQty: z.number().nullish(),
    minQty: z.number().nullish(),
    optionSelections: z.array(z.lazy(() => ProductComponentItemOptionSelectionSyncItemInputSchema())).nullish(),
    priceRule: z.lazy(() => ProductComponentPriceRuleInputSchema().nullish()),
    pricingTemplateId: z.string().nullish(),
    refProductId: z.string().nullish(),
    refVariantId: z.string().nullish(),
    selected: z.boolean(),
    sortIndex: z.number(),
    title: z.string().nullish(),
    visible: z.boolean()
  })
}

export function ProductComponentOperationInputSchema(): z.ZodObject<Properties<ProductComponentOperationInput>> {
  return z.object({
    action: ProductComponentOperationActionSchema,
    configurationId: z.string().nullish(),
    dependencyRules: z.array(z.lazy(() => ProductComponentDependencyRuleSyncItemInputSchema())).nullish(),
    displayStyle: ProductComponentDisplayStyleSchema.nullish(),
    groups: z.array(z.lazy(() => ProductComponentGroupSyncItemInputSchema())).nullish(),
    name: z.string().nullish(),
    pricingTemplates: z.array(z.lazy(() => ProductComponentPricingTemplateSyncItemInputSchema())).nullish()
  })
}

export function ProductComponentPriceRuleAmountInputSchema(): z.ZodObject<Properties<ProductComponentPriceRuleAmountInput>> {
  return z.object({
    amountMinor: z.string(),
    currency: CurrencyCodeSchema
  })
}

export function ProductComponentPriceRuleInputSchema(): z.ZodObject<Properties<ProductComponentPriceRuleInput>> {
  return z.object({
    amounts: z.array(z.lazy(() => ProductComponentPriceRuleAmountInputSchema())).nullish(),
    id: z.string().nullish(),
    operation: PriceAdjustmentOperationSchema.nullish(),
    percentageBps: z.number().nullish(),
    strategy: ProductComponentPriceStrategySchema,
    valueType: PriceAdjustmentValueTypeSchema.nullish()
  })
}

export function ProductComponentPricingTemplateSyncItemInputSchema(): z.ZodObject<Properties<ProductComponentPricingTemplateSyncItemInput>> {
  return z.object({
    id: z.string().nullish(),
    name: z.string(),
    priceRule: z.lazy(() => ProductComponentPriceRuleInputSchema()),
    sortIndex: z.number()
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
    categoryId: z.string(),
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

export function ProductFeatureCreateInputSchema(): z.ZodObject<Properties<ProductFeatureCreateInput>> {
  return z.object({
    featured: z.boolean().default(false).nullish(),
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
    featured: z.boolean().default(false).nullish(),
    name: z.string(),
    slug: z.string(),
    values: z.array(z.lazy(() => ProductFeatureValueCreateInputSchema()))
  })
}

export function ProductFeatureSyncItemInputSchema(): z.ZodObject<Properties<ProductFeatureSyncItemInput>> {
  return z.object({
    featured: z.boolean().default(false),
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
    featured: z.boolean().nullish(),
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

export function ProductOptionCategoryCreateInputSchema(): z.ZodObject<Properties<ProductOptionCategoryCreateInput>> {
  return z.object({
    name: z.string(),
    slug: z.string()
  })
}

export function ProductOptionCategoryOrderByInputSchema(): z.ZodObject<Properties<ProductOptionCategoryOrderByInput>> {
  return z.object({
    direction: SortDirectionSchema,
    field: ProductOptionCategoryOrderFieldSchema
  })
}

export function ProductOptionCategoryUpdateInputSchema(): z.ZodObject<Properties<ProductOptionCategoryUpdateInput>> {
  return z.object({
    name: z.string().nullish(),
    slug: z.string().nullish()
  })
}

export function ProductOptionCategoryWhereInputSchema(): z.ZodObject<Properties<ProductOptionCategoryWhereInput>> {
  return z.object({
    _and: z.array(z.lazy(() => ProductOptionCategoryWhereInputSchema())).nullish(),
    _not: z.lazy(() => ProductOptionCategoryWhereInputSchema().nullish()),
    _or: z.array(z.lazy(() => ProductOptionCategoryWhereInputSchema())).nullish(),
    createdAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    id: z.lazy(() => IdFilterSchema().nullish()),
    name: z.lazy(() => StringFilterSchema().nullish()),
    slug: z.lazy(() => StringFilterSchema().nullish()),
    updatedAt: z.lazy(() => DateTimeFilterSchema().nullish())
  })
}

export function ProductOptionCreateInputSchema(): z.ZodObject<Properties<ProductOptionCreateInput>> {
  return z.object({
    categoryId: z.string(),
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
    categoryId: z.string(),
    id: z.string().nullish(),
    name: z.string(),
    slug: z.string(),
    sortIndex: z.number(),
    values: z.array(z.lazy(() => ProductOptionValueSyncInputSchema()))
  })
}

export function ProductOptionUpdateInputSchema(): z.ZodObject<Properties<ProductOptionUpdateInput>> {
  return z.object({
    categoryId: z.string().nullish(),
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
    comparisonConfiguration: z.array(z.lazy(() => ProductComparisonConfigurationOperationInputSchema())).nullish(),
    components: z.array(z.lazy(() => ProductComponentOperationInputSchema())).nullish(),
    content: z.lazy(() => ProductContentInputSchema().nullish()),
    features: z.array(z.lazy(() => ProductFeatureSyncItemInputSchema())).nullish(),
    handle: z.string().nullish(),
    media: z.lazy(() => ProductMediaInputSchema().nullish()),
    options: z.array(z.lazy(() => ProductOptionSyncItemInputSchema())).nullish(),
    seo: z.lazy(() => ProductSeoInputSchema().nullish()),
    status: ProductStatusSchema.nullish(),
    tags: z.array(z.lazy(() => ProductTagOperationInputSchema())).nullish(),
    title: z.string().nullish(),
    variants: z.array(z.lazy(() => VariantOperationInputSchema())).nullish(),
    vendorId: z.string().nullish()
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
    maxAmountMinor: z.lazy(() => IntFilterSchema().nullish()),
    maxPriceMinor: z.lazy(() => IntFilterSchema().nullish()),
    minAmountMinor: z.lazy(() => IntFilterSchema().nullish()),
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

export function TagOrderByInputSchema(): z.ZodObject<Properties<TagOrderByInput>> {
  return z.object({
    direction: SortDirectionSchema,
    field: TagOrderFieldSchema
  })
}

export function TagUpdateInputSchema(): z.ZodObject<Properties<TagUpdateInput>> {
  return z.object({
    handle: z.string().nullish(),
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
    storeId: z.lazy(() => IdFilterSchema().nullish())
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
    continueSellingWhenOutOfStock: z.boolean().nullish(),
    costCurrency: CurrencyCodeSchema.nullish(),
    onHand: z.number().nullish(),
    requiresShipping: z.boolean().nullish(),
    sku: z.string().nullish(),
    trackInventory: z.boolean().nullish(),
    unavailable: z.number().nullish(),
    unitCostMinor: z.string().nullish(),
    warehouseId: z.string().nullish()
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

export function VendorUpdateInputSchema(): z.ZodObject<Properties<VendorUpdateInput>> {
  return z.object({
    name: z.string().nullish()
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

export function WarehouseBulkUpdateInputSchema(): z.ZodObject<Properties<WarehouseBulkUpdateInput>> {
  return z.object({
    warehouses: z.array(z.lazy(() => WarehouseBulkUpdateItemInputSchema()))
  })
}

export function WarehouseBulkUpdateItemInputSchema(): z.ZodObject<Properties<WarehouseBulkUpdateItemInput>> {
  return z.object({
    operations: z.lazy(() => WarehouseUpdateInputSchema()),
    warehouseId: z.string()
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

export function WarehouseStockOperationInputSchema(): z.ZodObject<Properties<WarehouseStockOperationInput>> {
  return z.object({
    action: WarehouseStockOperationActionSchema,
    variantId: z.string()
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
    isDefault: z.boolean().nullish(),
    name: z.string().nullish(),
    stock: z.array(z.lazy(() => WarehouseStockOperationInputSchema())).nullish()
  })
}

export function WarehouseWhereInputSchema(): z.ZodObject<Properties<WarehouseWhereInput>> {
  return z.object({
    _and: z.array(z.lazy(() => WarehouseWhereInputSchema())).nullish(),
    _not: z.lazy(() => WarehouseWhereInputSchema().nullish()),
    _or: z.array(z.lazy(() => WarehouseWhereInputSchema())).nullish(),
    addressLine1: z.lazy(() => StringFilterSchema().nullish()),
    addressLine2: z.lazy(() => StringFilterSchema().nullish()),
    city: z.lazy(() => StringFilterSchema().nullish()),
    code: z.lazy(() => StringFilterSchema().nullish()),
    countryCode: z.lazy(() => StringFilterSchema().nullish()),
    createdAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    id: z.lazy(() => IdFilterSchema().nullish()),
    isDefault: z.lazy(() => BooleanFilterSchema().nullish()),
    name: z.lazy(() => StringFilterSchema().nullish()),
    postalCode: z.lazy(() => StringFilterSchema().nullish()),
    provinceCode: z.lazy(() => StringFilterSchema().nullish()),
    provinceName: z.lazy(() => StringFilterSchema().nullish()),
    updatedAt: z.lazy(() => DateTimeFilterSchema().nullish())
  })
}

export function WeightInputSchema(): z.ZodObject<Properties<WeightInput>> {
  return z.object({
    value: z.number()
  })
}

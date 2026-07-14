import { z } from 'zod'
import { BooleanFilter, CurrencyCode, DateTimeFilter, DimensionUnit, FacetCreateInput, FacetCreateSourceInput, FacetCreateValueCandidateInput, FacetDeleteInput, FacetMoveInput, FacetRebalanceInput, FacetSelectionMode, FacetSourceCandidateOrderByInput, FacetSourceCandidateOrderField, FacetSourceCandidateWhereInput, FacetSwatchCreateInput, FacetSwatchDeleteInput, FacetSwatchUpdateInput, FacetType, FacetUiType, FacetUpdateInput, FacetValueCandidateOrderByInput, FacetValueCandidateOrderField, FacetValueCandidateType, FacetValueCandidateWhereInput, FacetValueCandidatesMetaInput, FacetValueCreateInput, FacetValueDeleteInput, FacetValueKind, FacetValueMergeInput, FacetValueUnmergeInput, FacetValueUpdateInput, FloatFilter, IdFilter, IntFilter, ListingFacetType, ListingFacetValueFilter, ListingOrderByInput, ListingPriceRangeFilter, ListingProductFilter, ListingScopeInput, ListingScopeKind, ListingSortBy, ListingSortDirection, ListingVariantOptionFilter, LocaleCode, SearchConfigurationOperationAction, SearchExecutionMode, SearchExplainClauseKind, SearchExplainReason, SearchField, SearchFieldConfigurationInput, SearchLexicalUnitKind, SearchOutOfStockPolicy, SearchProductBoostOperationInput, SearchProductBoostOrderByInput, SearchProductBoostOrderField, SearchProductBoostWhereInput, SearchProductBoostsMetaInput, SearchSettingsOperationType, SearchSettingsOperationsInput, SearchSettingsValuesInput, SearchSynonymGroupOperationInput, SearchSynonymGroupOrderByInput, SearchSynonymGroupOrderField, SearchSynonymGroupWhereInput, SortDirection, StringFilter, SwatchType, WeightUnit } from './types.js'

type Properties<T> = Required<{
  [K in keyof T]: z.ZodType<T[K], any, T[K]>;
}>;

type definedNonNullAny = {};

export const isDefinedNonNullAny = (v: any): v is definedNonNullAny => v !== undefined && v !== null;

export const definedNonNullAnySchema = z.any().refine((v) => isDefinedNonNullAny(v));

export const CurrencyCodeSchema = z.nativeEnum(CurrencyCode);

export const DimensionUnitSchema = z.nativeEnum(DimensionUnit);

export const FacetSelectionModeSchema = z.nativeEnum(FacetSelectionMode);

export const FacetSourceCandidateOrderFieldSchema = z.nativeEnum(FacetSourceCandidateOrderField);

export const FacetTypeSchema = z.nativeEnum(FacetType);

export const FacetUiTypeSchema = z.nativeEnum(FacetUiType);

export const FacetValueCandidateOrderFieldSchema = z.nativeEnum(FacetValueCandidateOrderField);

export const FacetValueCandidateTypeSchema = z.nativeEnum(FacetValueCandidateType);

export const FacetValueKindSchema = z.nativeEnum(FacetValueKind);

export const ListingFacetTypeSchema = z.nativeEnum(ListingFacetType);

export const ListingScopeKindSchema = z.nativeEnum(ListingScopeKind);

export const ListingSortBySchema = z.nativeEnum(ListingSortBy);

export const ListingSortDirectionSchema = z.nativeEnum(ListingSortDirection);

export const LocaleCodeSchema = z.nativeEnum(LocaleCode);

export const SearchConfigurationOperationActionSchema = z.nativeEnum(SearchConfigurationOperationAction);

export const SearchExecutionModeSchema = z.nativeEnum(SearchExecutionMode);

export const SearchExplainClauseKindSchema = z.nativeEnum(SearchExplainClauseKind);

export const SearchExplainReasonSchema = z.nativeEnum(SearchExplainReason);

export const SearchFieldSchema = z.nativeEnum(SearchField);

export const SearchLexicalUnitKindSchema = z.nativeEnum(SearchLexicalUnitKind);

export const SearchOutOfStockPolicySchema = z.nativeEnum(SearchOutOfStockPolicy);

export const SearchProductBoostOrderFieldSchema = z.nativeEnum(SearchProductBoostOrderField);

export const SearchSettingsOperationTypeSchema = z.nativeEnum(SearchSettingsOperationType);

export const SearchSynonymGroupOrderFieldSchema = z.nativeEnum(SearchSynonymGroupOrderField);

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

export function FacetCreateInputSchema(): z.ZodObject<Properties<FacetCreateInput>> {
  return z.object({
    facetType: FacetTypeSchema,
    label: z.string(),
    selectionMode: FacetSelectionModeSchema.nullish(),
    slug: z.string(),
    sources: z.array(z.lazy(() => FacetCreateSourceInputSchema())).nullish(),
    uiType: FacetUiTypeSchema.nullish(),
    valueCandidates: z.array(z.lazy(() => FacetCreateValueCandidateInputSchema())).nullish()
  })
}

export function FacetCreateSourceInputSchema(): z.ZodObject<Properties<FacetCreateSourceInput>> {
  return z.object({
    handle: z.string(),
    name: z.string()
  })
}

export function FacetCreateValueCandidateInputSchema(): z.ZodObject<Properties<FacetCreateValueCandidateInput>> {
  return z.object({
    handle: z.string(),
    label: z.string(),
    sourceHandle: z.string()
  })
}

export function FacetDeleteInputSchema(): z.ZodObject<Properties<FacetDeleteInput>> {
  return z.object({
    id: z.string()
  })
}

export function FacetMoveInputSchema(): z.ZodObject<Properties<FacetMoveInput>> {
  return z.object({
    afterFacetId: z.string().nullish(),
    beforeFacetId: z.string().nullish(),
    id: z.string()
  })
}

export function FacetRebalanceInputSchema(): z.ZodObject<Properties<FacetRebalanceInput>> {
  return z.object({
    confirm: z.boolean().default(true).nullish()
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
    id: z.string(),
    label: z.string().nullish(),
    selectionMode: FacetSelectionModeSchema.nullish(),
    slug: z.string().nullish(),
    uiType: FacetUiTypeSchema.nullish()
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

export function FacetValueCandidatesMetaInputSchema(): z.ZodObject<Properties<FacetValueCandidatesMetaInput>> {
  return z.object({
    candidateType: FacetValueCandidateTypeSchema,
    facetId: z.string().nullish(),
    sourceHandles: z.array(z.string()).nullish()
  })
}

export function FacetValueCreateInputSchema(): z.ZodObject<Properties<FacetValueCreateInput>> {
  return z.object({
    enabled: z.boolean().nullish(),
    facetId: z.string(),
    handle: z.string(),
    kind: FacetValueKindSchema.nullish(),
    label: z.string(),
    sortIndex: z.number().nullish(),
    sourceValueIds: z.array(z.string()).nullish(),
    swatchId: z.string().nullish()
  })
}

export function FacetValueDeleteInputSchema(): z.ZodObject<Properties<FacetValueDeleteInput>> {
  return z.object({
    id: z.string()
  })
}

export function FacetValueMergeInputSchema(): z.ZodObject<Properties<FacetValueMergeInput>> {
  return z.object({
    facetId: z.string(),
    sourceValueIds: z.array(z.string()),
    targetGroupValueId: z.string().nullish(),
    targetHandle: z.string().nullish(),
    targetLabel: z.string().nullish()
  })
}

export function FacetValueUnmergeInputSchema(): z.ZodObject<Properties<FacetValueUnmergeInput>> {
  return z.object({
    sourceValueIds: z.array(z.string())
  })
}

export function FacetValueUpdateInputSchema(): z.ZodObject<Properties<FacetValueUpdateInput>> {
  return z.object({
    enabled: z.boolean().nullish(),
    handle: z.string().nullish(),
    id: z.string(),
    label: z.string().nullish(),
    sortIndex: z.number().nullish(),
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

export function ListingFacetValueFilterSchema(): z.ZodObject<Properties<ListingFacetValueFilter>> {
  return z.object({
    facet: z.string(),
    value: z.string()
  })
}

export function ListingOrderByInputSchema(): z.ZodObject<Properties<ListingOrderByInput>> {
  return z.object({
    by: ListingSortBySchema,
    direction: ListingSortDirectionSchema.nullish()
  })
}

export function ListingPriceRangeFilterSchema(): z.ZodObject<Properties<ListingPriceRangeFilter>> {
  return z.object({
    max: z.string().nullish(),
    min: z.string().nullish()
  })
}

export function ListingProductFilterSchema(): z.ZodObject<Properties<ListingProductFilter>> {
  return z.object({
    available: z.boolean().nullish(),
    price: z.lazy(() => ListingPriceRangeFilterSchema().nullish()),
    productFacet: z.lazy(() => ListingFacetValueFilterSchema().nullish()),
    productVendor: z.string().nullish(),
    tag: z.string().nullish(),
    variantFacet: z.lazy(() => ListingFacetValueFilterSchema().nullish()),
    variantOption: z.lazy(() => ListingVariantOptionFilterSchema().nullish())
  })
}

export function ListingScopeInputSchema(): z.ZodObject<Properties<ListingScopeInput>> {
  return z.object({
    categoryId: z.string().nullish(),
    kind: ListingScopeKindSchema
  })
}

export function ListingVariantOptionFilterSchema(): z.ZodObject<Properties<ListingVariantOptionFilter>> {
  return z.object({
    name: z.string(),
    value: z.string()
  })
}

export function SearchFieldConfigurationInputSchema(): z.ZodObject<Properties<SearchFieldConfigurationInput>> {
  return z.object({
    field: SearchFieldSchema,
    weight: z.number()
  })
}

export function SearchProductBoostOperationInputSchema(): z.ZodObject<Properties<SearchProductBoostOperationInput>> {
  return z.object({
    action: SearchConfigurationOperationActionSchema,
    clientMutationId: z.string().nullish(),
    enabled: z.boolean().nullish(),
    id: z.string().nullish(),
    locale: LocaleCodeSchema.nullish(),
    name: z.string().nullish(),
    phrases: z.array(z.string()).nullish(),
    productIds: z.array(z.string()).nullish()
  })
}

export function SearchProductBoostOrderByInputSchema(): z.ZodObject<Properties<SearchProductBoostOrderByInput>> {
  return z.object({
    direction: SortDirectionSchema,
    field: SearchProductBoostOrderFieldSchema
  })
}

export function SearchProductBoostWhereInputSchema(): z.ZodObject<Properties<SearchProductBoostWhereInput>> {
  return z.object({
    _and: z.array(z.lazy(() => SearchProductBoostWhereInputSchema())).nullish(),
    _not: z.lazy(() => SearchProductBoostWhereInputSchema().nullish()),
    _or: z.array(z.lazy(() => SearchProductBoostWhereInputSchema())).nullish(),
    createdAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    enabled: z.lazy(() => BooleanFilterSchema().nullish()),
    id: z.lazy(() => IdFilterSchema().nullish()),
    locale: z.lazy(() => StringFilterSchema().nullish()),
    name: z.lazy(() => StringFilterSchema().nullish()),
    phrases: z.lazy(() => StringFilterSchema().nullish()),
    phrasesCount: z.lazy(() => IntFilterSchema().nullish()),
    productsCount: z.lazy(() => IntFilterSchema().nullish()),
    updatedAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    version: z.lazy(() => IntFilterSchema().nullish())
  })
}

export function SearchProductBoostsMetaInputSchema(): z.ZodObject<Properties<SearchProductBoostsMetaInput>> {
  return z.object({
    productIds: z.array(z.string())
  })
}

export function SearchSettingsOperationsInputSchema(): z.ZodObject<Properties<SearchSettingsOperationsInput>> {
  return z.object({
    productBoosts: z.array(z.lazy(() => SearchProductBoostOperationInputSchema())).nullish(),
    settings: z.lazy(() => SearchSettingsValuesInputSchema().nullish()),
    synonymGroups: z.array(z.lazy(() => SearchSynonymGroupOperationInputSchema())).nullish()
  })
}

export function SearchSettingsValuesInputSchema(): z.ZodObject<Properties<SearchSettingsValuesInput>> {
  return z.object({
    fields: z.array(z.lazy(() => SearchFieldConfigurationInputSchema())),
    outOfStockPolicy: SearchOutOfStockPolicySchema,
    typoToleranceEnabled: z.boolean()
  })
}

export function SearchSynonymGroupOperationInputSchema(): z.ZodObject<Properties<SearchSynonymGroupOperationInput>> {
  return z.object({
    action: SearchConfigurationOperationActionSchema,
    clientMutationId: z.string().nullish(),
    enabled: z.boolean().nullish(),
    id: z.string().nullish(),
    locale: LocaleCodeSchema.nullish(),
    name: z.string().nullish(),
    values: z.array(z.string()).nullish()
  })
}

export function SearchSynonymGroupOrderByInputSchema(): z.ZodObject<Properties<SearchSynonymGroupOrderByInput>> {
  return z.object({
    direction: SortDirectionSchema,
    field: SearchSynonymGroupOrderFieldSchema
  })
}

export function SearchSynonymGroupWhereInputSchema(): z.ZodObject<Properties<SearchSynonymGroupWhereInput>> {
  return z.object({
    _and: z.array(z.lazy(() => SearchSynonymGroupWhereInputSchema())).nullish(),
    _not: z.lazy(() => SearchSynonymGroupWhereInputSchema().nullish()),
    _or: z.array(z.lazy(() => SearchSynonymGroupWhereInputSchema())).nullish(),
    createdAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    enabled: z.lazy(() => BooleanFilterSchema().nullish()),
    id: z.lazy(() => IdFilterSchema().nullish()),
    locale: z.lazy(() => StringFilterSchema().nullish()),
    name: z.lazy(() => StringFilterSchema().nullish()),
    terms: z.lazy(() => StringFilterSchema().nullish()),
    updatedAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    valuesCount: z.lazy(() => IntFilterSchema().nullish()),
    version: z.lazy(() => IntFilterSchema().nullish())
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

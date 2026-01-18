import { z } from 'zod'
import { BooleanFilter, CurrencyCode, DateTimeFilter, DescriptionInput, DimensionUnit, DimensionsInput, FloatFilter, IdFilter, IntFilter, LocaleCode, OptionDisplayType, ProductCreateInput, ProductCreateOptionInput, ProductCreateOptionValueInput, ProductCreateVariantInput, ProductDeleteInput, ProductFeatureCreateInput, ProductFeatureDeleteInput, ProductFeatureInput, ProductFeatureUpdateInput, ProductFeatureValueCreateInput, ProductFeatureValueUpdateInput, ProductFeatureValuesInput, ProductOptionCreateInput, ProductOptionDeleteInput, ProductOptionSwatchInput, ProductOptionUpdateInput, ProductOptionValueCreateInput, ProductOptionValueUpdateInput, ProductOptionValuesInput, ProductPublishInput, ProductSeoInput, ProductUnpublishInput, ProductUpdateInput, SelectedOptionInput, SortDirection, StringFilter, SwatchType, VariantCreateInput, VariantDeleteInput, VariantInput, VariantSetCostInput, VariantSetDimensionsInput, VariantSetMediaInput, VariantSetPricingInput, VariantSetSkuInput, VariantSetStockInput, VariantSetWeightInput, WarehouseConnectionInput, WarehouseCreateInput, WarehouseDeleteInput, WarehouseOrderByInput, WarehouseOrderField, WarehouseStockConnectionInput, WarehouseStockOrderByInput, WarehouseStockOrderField, WarehouseStockWhereInput, WarehouseUpdateInput, WarehouseWhereInput, WeightInput, WeightUnit } from './types.js'

type Properties<T> = Required<{
  [K in keyof T]: z.ZodType<T[K], any, T[K]>;
}>;

type definedNonNullAny = {};

export const isDefinedNonNullAny = (v: any): v is definedNonNullAny => v !== undefined && v !== null;

export const definedNonNullAnySchema = z.any().refine((v) => isDefinedNonNullAny(v));

export const CurrencyCodeSchema = z.nativeEnum(CurrencyCode);

export const DimensionUnitSchema = z.nativeEnum(DimensionUnit);

export const LocaleCodeSchema = z.nativeEnum(LocaleCode);

export const OptionDisplayTypeSchema = z.nativeEnum(OptionDisplayType);

export const SortDirectionSchema = z.nativeEnum(SortDirection);

export const SwatchTypeSchema = z.nativeEnum(SwatchType);

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

export function DimensionsInputSchema(): z.ZodObject<Properties<DimensionsInput>> {
  return z.object({
    height: z.number(),
    length: z.number(),
    width: z.number()
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

export function ProductCreateInputSchema(): z.ZodObject<Properties<ProductCreateInput>> {
  return z.object({
    description: z.lazy(() => DescriptionInputSchema().nullish()),
    handle: z.string(),
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

export function ProductPublishInputSchema(): z.ZodObject<Properties<ProductPublishInput>> {
  return z.object({
    id: z.string()
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

export function ProductUnpublishInputSchema(): z.ZodObject<Properties<ProductUnpublishInput>> {
  return z.object({
    id: z.string()
  })
}

export function ProductUpdateInputSchema(): z.ZodObject<Properties<ProductUpdateInput>> {
  return z.object({
    description: z.lazy(() => DescriptionInputSchema().nullish()),
    excerpt: z.string().nullish(),
    handle: z.string().nullish(),
    id: z.string(),
    seo: z.lazy(() => ProductSeoInputSchema().nullish()),
    title: z.string().nullish()
  })
}

export function SelectedOptionInputSchema(): z.ZodObject<Properties<SelectedOptionInput>> {
  return z.object({
    optionId: z.string(),
    optionValueId: z.string()
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

export function VariantInputSchema(): z.ZodObject<Properties<VariantInput>> {
  return z.object({
    dimensions: z.lazy(() => DimensionsInputSchema().nullish()),
    externalId: z.string().nullish(),
    externalSystem: z.string().nullish(),
    options: z.array(z.lazy(() => SelectedOptionInputSchema())),
    sku: z.string().nullish(),
    title: z.string().nullish(),
    weight: z.lazy(() => WeightInputSchema().nullish())
  })
}

export function VariantSetCostInputSchema(): z.ZodObject<Properties<VariantSetCostInput>> {
  return z.object({
    currency: CurrencyCodeSchema,
    unitCostMinor: z.string(),
    variantId: z.string()
  })
}

export function VariantSetDimensionsInputSchema(): z.ZodObject<Properties<VariantSetDimensionsInput>> {
  return z.object({
    dimensions: z.lazy(() => DimensionsInputSchema()),
    variantId: z.string()
  })
}

export function VariantSetMediaInputSchema(): z.ZodObject<Properties<VariantSetMediaInput>> {
  return z.object({
    fileIds: z.array(z.string()),
    variantId: z.string()
  })
}

export function VariantSetPricingInputSchema(): z.ZodObject<Properties<VariantSetPricingInput>> {
  return z.object({
    amountMinor: z.string(),
    compareAtMinor: z.string().nullish(),
    currency: CurrencyCodeSchema,
    variantId: z.string()
  })
}

export function VariantSetSkuInputSchema(): z.ZodObject<Properties<VariantSetSkuInput>> {
  return z.object({
    sku: z.string(),
    variantId: z.string()
  })
}

export function VariantSetStockInputSchema(): z.ZodObject<Properties<VariantSetStockInput>> {
  return z.object({
    quantity: z.number(),
    variantId: z.string(),
    warehouseId: z.string()
  })
}

export function VariantSetWeightInputSchema(): z.ZodObject<Properties<VariantSetWeightInput>> {
  return z.object({
    variantId: z.string(),
    weight: z.lazy(() => WeightInputSchema())
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

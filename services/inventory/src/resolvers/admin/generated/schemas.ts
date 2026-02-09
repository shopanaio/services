import { z } from 'zod'
import { BooleanFilter, CurrencyCode, DateTimeFilter, DimensionUnit, DimensionsInput, FloatFilter, IdFilter, IntFilter, InventoryItemCostInput, InventoryItemDimensionsInput, InventoryItemStockInput, InventoryItemUpdateInput, InventoryItemWeightInput, InventoryItemWhereInput, LocaleCode, SortDirection, StringFilter, ThresholdMethod, WarehouseConnectionInput, WarehouseCreateInput, WarehouseDeleteInput, WarehouseOrderByInput, WarehouseOrderField, WarehouseStockConnectionInput, WarehouseStockOrderByInput, WarehouseStockOrderField, WarehouseStockWhereInput, WarehouseUpdateInput, WarehouseWhereInput, WeightInput, WeightUnit } from './types.js'

type Properties<T> = Required<{
  [K in keyof T]: z.ZodType<T[K], any, T[K]>;
}>;

type definedNonNullAny = {};

export const isDefinedNonNullAny = (v: any): v is definedNonNullAny => v !== undefined && v !== null;

export const definedNonNullAnySchema = z.any().refine((v) => isDefinedNonNullAny(v));

export const CurrencyCodeSchema = z.nativeEnum(CurrencyCode);

export const DimensionUnitSchema = z.nativeEnum(DimensionUnit);

export const LocaleCodeSchema = z.nativeEnum(LocaleCode);

export const SortDirectionSchema = z.nativeEnum(SortDirection);

export const ThresholdMethodSchema = z.nativeEnum(ThresholdMethod);

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

export function InventoryItemCostInputSchema(): z.ZodObject<Properties<InventoryItemCostInput>> {
  return z.object({
    amountMinor: z.string(),
    currency: z.string()
  })
}

export function InventoryItemDimensionsInputSchema(): z.ZodObject<Properties<InventoryItemDimensionsInput>> {
  return z.object({
    heightMm: z.number(),
    lengthMm: z.number(),
    widthMm: z.number()
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
    dimensions: z.lazy(() => InventoryItemDimensionsInputSchema().nullish()),
    id: z.string(),
    sku: z.string().nullish(),
    stock: z.lazy(() => InventoryItemStockInputSchema().nullish()),
    trackInventory: z.boolean().nullish(),
    unitCost: z.lazy(() => InventoryItemCostInputSchema().nullish()),
    weight: z.lazy(() => InventoryItemWeightInputSchema().nullish())
  })
}

export function InventoryItemWeightInputSchema(): z.ZodObject<Properties<InventoryItemWeightInput>> {
  return z.object({
    weightGrams: z.number()
  })
}

export function InventoryItemWhereInputSchema(): z.ZodObject<Properties<InventoryItemWhereInput>> {
  return z.object({
    sku: z.lazy(() => StringFilterSchema().nullish()),
    trackInventory: z.boolean().nullish()
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

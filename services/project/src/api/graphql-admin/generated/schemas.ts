import { z } from 'zod'
import { ApiKeyCreateInput, ApiKeyDeleteInput, ApiKeyRevokeInput, CurrencyCode, CurrencyCreateInput, CurrencyDeleteInput, CurrencySetDefaultInput, DimensionUnit, LocaleCode, LocaleCreateInput, LocaleDeleteInput, LocaleSetDefaultInput, StoreCreateInput, StoreDeleteInput, StoreStatus, StoreUpdateInput, WeightUnit } from './types.js'

type Properties<T> = Required<{
  [K in keyof T]: z.ZodType<T[K], any, T[K]>;
}>;

type definedNonNullAny = {};

export const isDefinedNonNullAny = (v: any): v is definedNonNullAny => v !== undefined && v !== null;

export const definedNonNullAnySchema = z.any().refine((v) => isDefinedNonNullAny(v));

export const CurrencyCodeSchema = z.nativeEnum(CurrencyCode);

export const DimensionUnitSchema = z.nativeEnum(DimensionUnit);

export const LocaleCodeSchema = z.nativeEnum(LocaleCode);

export const StoreStatusSchema = z.nativeEnum(StoreStatus);

export const WeightUnitSchema = z.nativeEnum(WeightUnit);

export function ApiKeyCreateInputSchema(): z.ZodObject<Properties<ApiKeyCreateInput>> {
  return z.object({
    dueDate: z.string().nullish(),
    name: z.string()
  })
}

export function ApiKeyDeleteInputSchema(): z.ZodObject<Properties<ApiKeyDeleteInput>> {
  return z.object({
    id: z.string()
  })
}

export function ApiKeyRevokeInputSchema(): z.ZodObject<Properties<ApiKeyRevokeInput>> {
  return z.object({
    id: z.string()
  })
}

export function CurrencyCreateInputSchema(): z.ZodObject<Properties<CurrencyCreateInput>> {
  return z.object({
    code: CurrencyCodeSchema,
    isActive: z.boolean()
  })
}

export function CurrencyDeleteInputSchema(): z.ZodObject<Properties<CurrencyDeleteInput>> {
  return z.object({
    code: CurrencyCodeSchema
  })
}

export function CurrencySetDefaultInputSchema(): z.ZodObject<Properties<CurrencySetDefaultInput>> {
  return z.object({
    currency: CurrencyCodeSchema
  })
}

export function LocaleCreateInputSchema(): z.ZodObject<Properties<LocaleCreateInput>> {
  return z.object({
    code: LocaleCodeSchema,
    isActive: z.boolean()
  })
}

export function LocaleDeleteInputSchema(): z.ZodObject<Properties<LocaleDeleteInput>> {
  return z.object({
    code: LocaleCodeSchema
  })
}

export function LocaleSetDefaultInputSchema(): z.ZodObject<Properties<LocaleSetDefaultInput>> {
  return z.object({
    locale: LocaleCodeSchema
  })
}

export function StoreCreateInputSchema(): z.ZodObject<Properties<StoreCreateInput>> {
  return z.object({
    currencies: z.array(CurrencyCodeSchema),
    defaultCurrency: CurrencyCodeSchema,
    displayName: z.string(),
    email: z.string().nullish(),
    locales: z.array(LocaleCodeSchema),
    name: z.string(),
    organizationId: z.string(),
    status: StoreStatusSchema.nullish(),
    timezone: z.string().nullish()
  })
}

export function StoreDeleteInputSchema(): z.ZodObject<Properties<StoreDeleteInput>> {
  return z.object({
    id: z.string(),
    organizationId: z.string()
  })
}

export function StoreUpdateInputSchema(): z.ZodObject<Properties<StoreUpdateInput>> {
  return z.object({
    currencies: z.array(CurrencyCodeSchema).nullish(),
    defaultDimensionUnit: DimensionUnitSchema.nullish(),
    defaultWeightUnit: WeightUnitSchema.nullish(),
    displayName: z.string().nullish(),
    email: z.string().nullish(),
    id: z.string(),
    locales: z.array(LocaleCodeSchema).nullish(),
    name: z.string().nullish(),
    organizationId: z.string(),
    timezone: z.string().nullish()
  })
}

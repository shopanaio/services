import { z } from 'zod'
import { ApiKeyCreateInput, ApiKeyDeleteInput, ApiKeyRevokeInput, AutomaticFulfillmentMode, CurrencyCode, CurrencyDisplay, CurrencyGrouping, CurrencyRoundingMode, CurrencySign, CurrencySignDisplay, CurrencyTrailingZeroDisplay, DimensionUnit, LocaleCode, LocaleCreateInput, LocaleDeleteInput, LocaleSetDefaultInput, StoreAddressUpdateInput, StoreBrandUpdateInput, StoreContactDetailsUpdateInput, StoreCreateInput, StoreCurrencySettingsUpdateInput, StoreDefaultsUpdateInput, StoreDeleteInput, StoreOrderProcessingUpdateInput, StoreSocialLinkInput, StoreStatus, StoreUpdateInput, StoreUpdateOperationType, UnitSystem, WeightUnit } from './types.js'

type Properties<T> = Required<{
  [K in keyof T]: z.ZodType<T[K], any, T[K]>;
}>;

type definedNonNullAny = {};

export const isDefinedNonNullAny = (v: any): v is definedNonNullAny => v !== undefined && v !== null;

export const definedNonNullAnySchema = z.any().refine((v) => isDefinedNonNullAny(v));

export const AutomaticFulfillmentModeSchema = z.nativeEnum(AutomaticFulfillmentMode);

export const CurrencyCodeSchema = z.nativeEnum(CurrencyCode);

export const CurrencyDisplaySchema = z.nativeEnum(CurrencyDisplay);

export const CurrencyGroupingSchema = z.nativeEnum(CurrencyGrouping);

export const CurrencyRoundingModeSchema = z.nativeEnum(CurrencyRoundingMode);

export const CurrencySignSchema = z.nativeEnum(CurrencySign);

export const CurrencySignDisplaySchema = z.nativeEnum(CurrencySignDisplay);

export const CurrencyTrailingZeroDisplaySchema = z.nativeEnum(CurrencyTrailingZeroDisplay);

export const DimensionUnitSchema = z.nativeEnum(DimensionUnit);

export const LocaleCodeSchema = z.nativeEnum(LocaleCode);

export const StoreStatusSchema = z.nativeEnum(StoreStatus);

export const StoreUpdateOperationTypeSchema = z.nativeEnum(StoreUpdateOperationType);

export const UnitSystemSchema = z.nativeEnum(UnitSystem);

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

export function StoreAddressUpdateInputSchema(): z.ZodObject<Properties<StoreAddressUpdateInput>> {
  return z.object({
    addressLine1: z.string().nullish(),
    addressLine2: z.string().nullish(),
    administrativeArea: z.string().nullish(),
    city: z.string().nullish(),
    companyName: z.string().nullish(),
    countryCode: z.string(),
    postalCode: z.string().nullish()
  })
}

export function StoreBrandUpdateInputSchema(): z.ZodObject<Properties<StoreBrandUpdateInput>> {
  return z.object({
    coverImageId: z.string().nullish(),
    defaultLogoId: z.string().nullish(),
    primaryColor: z.string(),
    secondaryColor: z.string(),
    shortDescription: z.string().nullish(),
    slogan: z.string().nullish(),
    socialLinks: z.array(z.lazy(() => StoreSocialLinkInputSchema())),
    squareLogoId: z.string().nullish()
  })
}

export function StoreContactDetailsUpdateInputSchema(): z.ZodObject<Properties<StoreContactDetailsUpdateInput>> {
  return z.object({
    email: z.string().email().nullish(),
    name: z.string(),
    phoneNumbers: z.array(z.string()),
    slug: z.string()
  })
}

export function StoreCreateInputSchema(): z.ZodObject<Properties<StoreCreateInput>> {
  return z.object({
    currencyCode: CurrencyCodeSchema,
    displayName: z.string(),
    email: z.string().nullish(),
    locales: z.array(LocaleCodeSchema),
    name: z.string(),
    organizationId: z.string(),
    status: StoreStatusSchema.nullish(),
    timezone: z.string().nullish()
  })
}

export function StoreCurrencySettingsUpdateInputSchema(): z.ZodObject<Properties<StoreCurrencySettingsUpdateInput>> {
  return z.object({
    currencyCode: CurrencyCodeSchema,
    currencyDisplay: CurrencyDisplaySchema,
    currencySign: CurrencySignSchema,
    grouping: CurrencyGroupingSchema,
    maximumFractionDigits: z.number(),
    minimumFractionDigits: z.number(),
    roundingMode: CurrencyRoundingModeSchema,
    signDisplay: CurrencySignDisplaySchema,
    trailingZeroDisplay: CurrencyTrailingZeroDisplaySchema
  })
}

export function StoreDefaultsUpdateInputSchema(): z.ZodObject<Properties<StoreDefaultsUpdateInput>> {
  return z.object({
    defaultDimensionUnit: DimensionUnitSchema,
    defaultWeightUnit: WeightUnitSchema,
    timezone: z.string(),
    unitSystem: UnitSystemSchema
  })
}

export function StoreDeleteInputSchema(): z.ZodObject<Properties<StoreDeleteInput>> {
  return z.object({
    id: z.string(),
    organizationId: z.string()
  })
}

export function StoreOrderProcessingUpdateInputSchema(): z.ZodObject<Properties<StoreOrderProcessingUpdateInput>> {
  return z.object({
    automaticFulfillmentMode: AutomaticFulfillmentModeSchema,
    automaticallyArchiveOrders: z.boolean(),
    orderNumberPrefix: z.string(),
    orderNumberSuffix: z.string().nullish(),
    requireCheckoutConfirmation: z.boolean()
  })
}

export function StoreSocialLinkInputSchema(): z.ZodObject<Properties<StoreSocialLinkInput>> {
  return z.object({
    platform: z.string(),
    url: z.string()
  })
}

export function StoreUpdateInputSchema(): z.ZodObject<Properties<StoreUpdateInput>> {
  return z.object({
    address: z.lazy(() => StoreAddressUpdateInputSchema().nullish()),
    brand: z.lazy(() => StoreBrandUpdateInputSchema().nullish()),
    contactDetails: z.lazy(() => StoreContactDetailsUpdateInputSchema().nullish()),
    currencySettings: z.lazy(() => StoreCurrencySettingsUpdateInputSchema().nullish()),
    defaults: z.lazy(() => StoreDefaultsUpdateInputSchema().nullish()),
    orderProcessing: z.lazy(() => StoreOrderProcessingUpdateInputSchema().nullish())
  })
}

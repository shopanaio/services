import { z } from 'zod'
import { CountryCode, CurrencyCode, CustomerAccountStatus, CustomerAddressCreateInput, CustomerAddressDefaultSetInput, CustomerAddressDefaultType, CustomerAddressDeleteInput, CustomerAddressInput, CustomerAddressUpdateInput, CustomerAddressValidationStatus, CustomerComparisonCategoryClearInput, CustomerComparisonVariantAddInput, CustomerComparisonVariantRemoveInput, CustomerDataRequestCancelInput, CustomerDataRequestCreateInput, CustomerDataRequestStatus, CustomerDataRequestType, CustomerMarketingConsentChannel, CustomerMarketingConsentOptInLevel, CustomerMarketingConsentState, CustomerMarketingConsentTargetState, CustomerMarketingConsentUpdateInput, CustomerTaxExemptionStatus, CustomerTaxIdentifierCreateInput, CustomerTaxIdentifierDeleteInput, CustomerTaxIdentifierStatus, CustomerTaxIdentifierUpdateInput, CustomerUpdateInput, DimensionUnit, LocaleCode, WeightUnit, WishlistCreateInput, WishlistDeleteInput, WishlistProductAddInput, WishlistProductRemoveInput, WishlistUpdateInput } from './types.js'

type Properties<T> = Required<{
  [K in keyof T]: z.ZodType<T[K], any, T[K]>;
}>;

type definedNonNullAny = {};

export const isDefinedNonNullAny = (v: any): v is definedNonNullAny => v !== undefined && v !== null;

export const definedNonNullAnySchema = z.any().refine((v) => isDefinedNonNullAny(v));

export const CountryCodeSchema = z.nativeEnum(CountryCode);

export const CurrencyCodeSchema = z.nativeEnum(CurrencyCode);

export const CustomerAccountStatusSchema = z.nativeEnum(CustomerAccountStatus);

export const CustomerAddressDefaultTypeSchema = z.nativeEnum(CustomerAddressDefaultType);

export const CustomerAddressValidationStatusSchema = z.nativeEnum(CustomerAddressValidationStatus);

export const CustomerDataRequestStatusSchema = z.nativeEnum(CustomerDataRequestStatus);

export const CustomerDataRequestTypeSchema = z.nativeEnum(CustomerDataRequestType);

export const CustomerMarketingConsentChannelSchema = z.nativeEnum(CustomerMarketingConsentChannel);

export const CustomerMarketingConsentOptInLevelSchema = z.nativeEnum(CustomerMarketingConsentOptInLevel);

export const CustomerMarketingConsentStateSchema = z.nativeEnum(CustomerMarketingConsentState);

export const CustomerMarketingConsentTargetStateSchema = z.nativeEnum(CustomerMarketingConsentTargetState);

export const CustomerTaxExemptionStatusSchema = z.nativeEnum(CustomerTaxExemptionStatus);

export const CustomerTaxIdentifierStatusSchema = z.nativeEnum(CustomerTaxIdentifierStatus);

export const DimensionUnitSchema = z.nativeEnum(DimensionUnit);

export const LocaleCodeSchema = z.nativeEnum(LocaleCode);

export const WeightUnitSchema = z.nativeEnum(WeightUnit);

export function CustomerAddressCreateInputSchema(): z.ZodObject<Properties<CustomerAddressCreateInput>> {
  return z.object({
    address: z.lazy(() => CustomerAddressInputSchema()),
    defaultBilling: z.boolean().default(false).nullish(),
    defaultShipping: z.boolean().default(false).nullish(),
    expectedRevision: z.number(),
    idempotencyKey: z.string()
  })
}

export function CustomerAddressDefaultSetInputSchema(): z.ZodObject<Properties<CustomerAddressDefaultSetInput>> {
  return z.object({
    addressId: z.string().nullish(),
    defaults: z.array(CustomerAddressDefaultTypeSchema),
    expectedRevision: z.number(),
    idempotencyKey: z.string()
  })
}

export function CustomerAddressDeleteInputSchema(): z.ZodObject<Properties<CustomerAddressDeleteInput>> {
  return z.object({
    addressId: z.string(),
    expectedRevision: z.number(),
    idempotencyKey: z.string()
  })
}

export function CustomerAddressInputSchema(): z.ZodObject<Properties<CustomerAddressInput>> {
  return z.object({
    address1: z.string(),
    address2: z.string().nullish(),
    city: z.string(),
    company: z.string().nullish(),
    countryCode: CountryCodeSchema,
    firstName: z.string().nullish(),
    label: z.string().nullish(),
    lastName: z.string().nullish(),
    middleName: z.string().nullish(),
    phone: z.string().nullish(),
    prefix: z.string().nullish(),
    provinceCode: z.string().nullish(),
    suffix: z.string().nullish(),
    zip: z.string().nullish()
  })
}

export function CustomerAddressUpdateInputSchema(): z.ZodObject<Properties<CustomerAddressUpdateInput>> {
  return z.object({
    address: z.lazy(() => CustomerAddressInputSchema()),
    addressId: z.string(),
    defaultBilling: z.boolean().nullish(),
    defaultShipping: z.boolean().nullish(),
    expectedRevision: z.number(),
    idempotencyKey: z.string()
  })
}

export function CustomerComparisonCategoryClearInputSchema(): z.ZodObject<Properties<CustomerComparisonCategoryClearInput>> {
  return z.object({
    categoryId: z.string(),
    expectedRevision: z.number(),
    idempotencyKey: z.string()
  })
}

export function CustomerComparisonVariantAddInputSchema(): z.ZodObject<Properties<CustomerComparisonVariantAddInput>> {
  return z.object({
    expectedRevision: z.number(),
    idempotencyKey: z.string(),
    variantId: z.string()
  })
}

export function CustomerComparisonVariantRemoveInputSchema(): z.ZodObject<Properties<CustomerComparisonVariantRemoveInput>> {
  return z.object({
    expectedRevision: z.number(),
    idempotencyKey: z.string(),
    variantId: z.string()
  })
}

export function CustomerDataRequestCancelInputSchema(): z.ZodObject<Properties<CustomerDataRequestCancelInput>> {
  return z.object({
    dataRequestId: z.string(),
    expectedUpdatedAt: z.string(),
    idempotencyKey: z.string()
  })
}

export function CustomerDataRequestCreateInputSchema(): z.ZodObject<Properties<CustomerDataRequestCreateInput>> {
  return z.object({
    correctionDetails: z.record(z.unknown()).nullish(),
    idempotencyKey: z.string(),
    type: CustomerDataRequestTypeSchema
  })
}

export function CustomerMarketingConsentUpdateInputSchema(): z.ZodObject<Properties<CustomerMarketingConsentUpdateInput>> {
  return z.object({
    channel: CustomerMarketingConsentChannelSchema,
    expectedRevision: z.number(),
    idempotencyKey: z.string(),
    state: CustomerMarketingConsentTargetStateSchema
  })
}

export function CustomerTaxIdentifierCreateInputSchema(): z.ZodObject<Properties<CustomerTaxIdentifierCreateInput>> {
  return z.object({
    countryCode: CountryCodeSchema.nullish(),
    expectedRevision: z.number(),
    idempotencyKey: z.string(),
    identifierType: z.string(),
    isPrimary: z.boolean().default(false).nullish(),
    value: z.string()
  })
}

export function CustomerTaxIdentifierDeleteInputSchema(): z.ZodObject<Properties<CustomerTaxIdentifierDeleteInput>> {
  return z.object({
    expectedRevision: z.number(),
    idempotencyKey: z.string(),
    taxIdentifierId: z.string()
  })
}

export function CustomerTaxIdentifierUpdateInputSchema(): z.ZodObject<Properties<CustomerTaxIdentifierUpdateInput>> {
  return z.object({
    countryCode: CountryCodeSchema.nullish(),
    expectedRevision: z.number(),
    idempotencyKey: z.string(),
    identifierType: z.string().nullish(),
    isPrimary: z.boolean().nullish(),
    taxIdentifierId: z.string(),
    value: z.string().nullish()
  })
}

export function CustomerUpdateInputSchema(): z.ZodObject<Properties<CustomerUpdateInput>> {
  return z.object({
    companyName: z.string().nullish(),
    dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
    expectedRevision: z.number(),
    firstName: z.string().nullish(),
    gender: z.string().nullish(),
    idempotencyKey: z.string(),
    jobTitle: z.string().nullish(),
    lastName: z.string().nullish(),
    middleName: z.string().nullish(),
    preferredLocale: z.string().nullish(),
    prefix: z.string().nullish(),
    suffix: z.string().nullish()
  })
}

export function WishlistCreateInputSchema(): z.ZodObject<Properties<WishlistCreateInput>> {
  return z.object({
    idempotencyKey: z.string(),
    name: z.string()
  })
}

export function WishlistDeleteInputSchema(): z.ZodObject<Properties<WishlistDeleteInput>> {
  return z.object({
    expectedUpdatedAt: z.string(),
    id: z.string(),
    idempotencyKey: z.string()
  })
}

export function WishlistProductAddInputSchema(): z.ZodObject<Properties<WishlistProductAddInput>> {
  return z.object({
    idempotencyKey: z.string(),
    productId: z.string(),
    wishlistId: z.string().nullish()
  })
}

export function WishlistProductRemoveInputSchema(): z.ZodObject<Properties<WishlistProductRemoveInput>> {
  return z.object({
    idempotencyKey: z.string(),
    itemId: z.string()
  })
}

export function WishlistUpdateInputSchema(): z.ZodObject<Properties<WishlistUpdateInput>> {
  return z.object({
    expectedUpdatedAt: z.string(),
    id: z.string(),
    idempotencyKey: z.string(),
    name: z.string()
  })
}

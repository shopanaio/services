import { z } from 'zod'
import { AppCapabilityAssignmentMode, AppCapabilityAssignmentStatus, AppCapabilityBindingStatus, AppConfigureInput, AppInstallInput, AppInstallationActionInput, AppInstallationHealthStatus, AppInstallationStatus, AppLifecycleActorType, AppLifecycleOperationStatus, AppLifecycleOperationType, AppOrderByInput, AppOrderField, AppRuntimeHealthStatus, AppRuntimeStatus, AppSecretInput, AppUpdateInput, AppWhereInput, BooleanFilter, CurrencyCode, DateTimeFilter, DimensionUnit, FloatFilter, IdFilter, IntFilter, LocaleCode, PriceAdjustmentOperation, PriceAdjustmentValueType, SortDirection, StringFilter, WeightUnit } from './types.js'

type Properties<T> = Required<{
  [K in keyof T]: z.ZodType<T[K], any, T[K]>;
}>;

type definedNonNullAny = {};

export const isDefinedNonNullAny = (v: any): v is definedNonNullAny => v !== undefined && v !== null;

export const definedNonNullAnySchema = z.any().refine((v) => isDefinedNonNullAny(v));

export const AppCapabilityAssignmentModeSchema = z.nativeEnum(AppCapabilityAssignmentMode);

export const AppCapabilityAssignmentStatusSchema = z.nativeEnum(AppCapabilityAssignmentStatus);

export const AppCapabilityBindingStatusSchema = z.nativeEnum(AppCapabilityBindingStatus);

export const AppInstallationHealthStatusSchema = z.nativeEnum(AppInstallationHealthStatus);

export const AppInstallationStatusSchema = z.nativeEnum(AppInstallationStatus);

export const AppLifecycleActorTypeSchema = z.nativeEnum(AppLifecycleActorType);

export const AppLifecycleOperationStatusSchema = z.nativeEnum(AppLifecycleOperationStatus);

export const AppLifecycleOperationTypeSchema = z.nativeEnum(AppLifecycleOperationType);

export const AppOrderFieldSchema = z.nativeEnum(AppOrderField);

export const AppRuntimeHealthStatusSchema = z.nativeEnum(AppRuntimeHealthStatus);

export const AppRuntimeStatusSchema = z.nativeEnum(AppRuntimeStatus);

export const CurrencyCodeSchema = z.nativeEnum(CurrencyCode);

export const DimensionUnitSchema = z.nativeEnum(DimensionUnit);

export const LocaleCodeSchema = z.nativeEnum(LocaleCode);

export const PriceAdjustmentOperationSchema = z.nativeEnum(PriceAdjustmentOperation);

export const PriceAdjustmentValueTypeSchema = z.nativeEnum(PriceAdjustmentValueType);

export const SortDirectionSchema = z.nativeEnum(SortDirection);

export const WeightUnitSchema = z.nativeEnum(WeightUnit);

export function AppConfigureInputSchema(): z.ZodObject<Properties<AppConfigureInput>> {
  return z.object({
    configuration: z.record(z.unknown()),
    grantedScopes: z.array(z.string()).nullish(),
    installationId: z.string()
  })
}

export function AppInstallInputSchema(): z.ZodObject<Properties<AppInstallInput>> {
  return z.object({
    appCode: z.string(),
    configuration: z.record(z.unknown()).nullish(),
    grantedScopes: z.array(z.string()).nullish(),
    secrets: z.array(z.lazy(() => AppSecretInputSchema())).nullish()
  })
}

export function AppInstallationActionInputSchema(): z.ZodObject<Properties<AppInstallationActionInput>> {
  return z.object({
    installationId: z.string()
  })
}

export function AppOrderByInputSchema(): z.ZodObject<Properties<AppOrderByInput>> {
  return z.object({
    direction: SortDirectionSchema,
    field: AppOrderFieldSchema
  })
}

export function AppSecretInputSchema(): z.ZodObject<Properties<AppSecretInput>> {
  return z.object({
    name: z.string(),
    value: z.string()
  })
}

export function AppUpdateInputSchema(): z.ZodObject<Properties<AppUpdateInput>> {
  return z.object({
    configuration: z.record(z.unknown()).nullish(),
    grantedScopes: z.array(z.string()).nullish(),
    installationId: z.string(),
    secrets: z.array(z.lazy(() => AppSecretInputSchema())).nullish()
  })
}

export function AppWhereInputSchema(): z.ZodObject<Properties<AppWhereInput>> {
  return z.object({
    _and: z.array(z.lazy(() => AppWhereInputSchema())).nullish(),
    _not: z.lazy(() => AppWhereInputSchema().nullish()),
    _or: z.array(z.lazy(() => AppWhereInputSchema())).nullish(),
    capabilities: z.lazy(() => StringFilterSchema().nullish()),
    code: z.lazy(() => StringFilterSchema().nullish()),
    displayName: z.lazy(() => StringFilterSchema().nullish()),
    installed: z.lazy(() => BooleanFilterSchema().nullish()),
    status: z.lazy(() => StringFilterSchema().nullish()),
    updatedAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    version: z.lazy(() => StringFilterSchema().nullish())
  })
}

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

import { z } from 'zod'
import { AppCapabilityAssignmentStatus, AppCapabilityBindingStatus, AppConfigureInput, AppDefinitionWhereInput, AppExtensionKind, AppInstallInput, AppInstallationActionInput, AppInstallationHealthStatus, AppInstallationOrderByInput, AppInstallationOrderField, AppInstallationStatus, AppInstallationWhereInput, AppLifecycleActorType, AppLifecycleOperationStatus, AppLifecycleOperationType, AppOrderDirection, AppRuntimeHealthStatus, AppRuntimeStatus, AppSecretInput, AppUpdateInput, CurrencyCode, DimensionUnit, LocaleCode, SalesChannelConnectionActionInput, SalesChannelConnectionCreateInput, SalesChannelConnectionStatus, SalesChannelConnectionUpdateInput, SalesChannelHealthStatus, SalesChannelOperationType, WeightUnit } from './types.js'

type Properties<T> = Required<{
  [K in keyof T]: z.ZodType<T[K], any, T[K]>;
}>;

type definedNonNullAny = {};

export const isDefinedNonNullAny = (v: any): v is definedNonNullAny => v !== undefined && v !== null;

export const definedNonNullAnySchema = z.any().refine((v) => isDefinedNonNullAny(v));

export const AppCapabilityAssignmentStatusSchema = z.nativeEnum(AppCapabilityAssignmentStatus);

export const AppCapabilityBindingStatusSchema = z.nativeEnum(AppCapabilityBindingStatus);

export const AppExtensionKindSchema = z.nativeEnum(AppExtensionKind);

export const AppInstallationHealthStatusSchema = z.nativeEnum(AppInstallationHealthStatus);

export const AppInstallationOrderFieldSchema = z.nativeEnum(AppInstallationOrderField);

export const AppInstallationStatusSchema = z.nativeEnum(AppInstallationStatus);

export const AppLifecycleActorTypeSchema = z.nativeEnum(AppLifecycleActorType);

export const AppLifecycleOperationStatusSchema = z.nativeEnum(AppLifecycleOperationStatus);

export const AppLifecycleOperationTypeSchema = z.nativeEnum(AppLifecycleOperationType);

export const AppOrderDirectionSchema = z.nativeEnum(AppOrderDirection);

export const AppRuntimeHealthStatusSchema = z.nativeEnum(AppRuntimeHealthStatus);

export const AppRuntimeStatusSchema = z.nativeEnum(AppRuntimeStatus);

export const CurrencyCodeSchema = z.nativeEnum(CurrencyCode);

export const DimensionUnitSchema = z.nativeEnum(DimensionUnit);

export const LocaleCodeSchema = z.nativeEnum(LocaleCode);

export const SalesChannelConnectionStatusSchema = z.nativeEnum(SalesChannelConnectionStatus);

export const SalesChannelHealthStatusSchema = z.nativeEnum(SalesChannelHealthStatus);

export const SalesChannelOperationTypeSchema = z.nativeEnum(SalesChannelOperationType);

export const WeightUnitSchema = z.nativeEnum(WeightUnit);

export function AppConfigureInputSchema(): z.ZodObject<Properties<AppConfigureInput>> {
  return z.object({
    configuration: z.record(z.unknown()),
    expectedConfigurationVersion: z.number(),
    grantedScopes: z.array(z.string()).nullish(),
    installationId: z.string()
  })
}

export function AppDefinitionWhereInputSchema(): z.ZodObject<Properties<AppDefinitionWhereInput>> {
  return z.object({
    extensionKinds: z.array(AppExtensionKindSchema).nullish(),
    installed: z.boolean().nullish()
  })
}

export function AppInstallInputSchema(): z.ZodObject<Properties<AppInstallInput>> {
  return z.object({
    appCode: z.string(),
    clientMutationId: z.string(),
    configuration: z.record(z.unknown()).nullish(),
    grantedScopes: z.array(z.string()).nullish(),
    secrets: z.array(z.lazy(() => AppSecretInputSchema())).nullish()
  })
}

export function AppInstallationActionInputSchema(): z.ZodObject<Properties<AppInstallationActionInput>> {
  return z.object({
    clientMutationId: z.string(),
    installationId: z.string()
  })
}

export function AppInstallationOrderByInputSchema(): z.ZodObject<Properties<AppInstallationOrderByInput>> {
  return z.object({
    direction: AppOrderDirectionSchema,
    field: AppInstallationOrderFieldSchema
  })
}

export function AppInstallationWhereInputSchema(): z.ZodObject<Properties<AppInstallationWhereInput>> {
  return z.object({
    appCodes: z.array(z.string()).nullish(),
    healthStatuses: z.array(AppInstallationHealthStatusSchema).nullish(),
    statuses: z.array(AppInstallationStatusSchema).nullish()
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
    clientMutationId: z.string(),
    configuration: z.record(z.unknown()).nullish(),
    expectedConfigurationVersion: z.number().nullish(),
    grantedScopes: z.array(z.string()).nullish(),
    installationId: z.string(),
    secrets: z.array(z.lazy(() => AppSecretInputSchema())).nullish()
  })
}

export function SalesChannelConnectionActionInputSchema(): z.ZodObject<Properties<SalesChannelConnectionActionInput>> {
  return z.object({
    clientMutationId: z.string(),
    connectionId: z.string()
  })
}

export function SalesChannelConnectionCreateInputSchema(): z.ZodObject<Properties<SalesChannelConnectionCreateInput>> {
  return z.object({
    clientMutationId: z.string(),
    configuration: z.record(z.unknown()).nullish(),
    displayName: z.string(),
    installationId: z.string(),
    specificationId: z.string()
  })
}

export function SalesChannelConnectionUpdateInputSchema(): z.ZodObject<Properties<SalesChannelConnectionUpdateInput>> {
  return z.object({
    clientMutationId: z.string(),
    configuration: z.record(z.unknown()),
    connectionId: z.string(),
    displayName: z.string().nullish(),
    expectedConfigurationVersion: z.number(),
    targetSpecificationId: z.string().nullish()
  })
}

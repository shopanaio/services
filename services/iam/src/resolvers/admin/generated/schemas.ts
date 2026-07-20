import { z } from 'zod'
import { Action, ApplicationArchiveInput, ApplicationAuthBackgroundColor, ApplicationAuthBrandingInput, ApplicationAuthEmailDeliveryInput, ApplicationAuthMethodCapability, ApplicationAuthMethodUpdateInput, ApplicationAuthPrimaryColor, ApplicationAuthProviderConfigureInput, ApplicationAuthProviderCredentialsDeleteInput, ApplicationAuthProviderCredentialsRotateInput, ApplicationAuthProviderName, ApplicationAuthProviderUpdateInput, ApplicationAuthProviderValidateInput, ApplicationAuthProviderValidationStatus, ApplicationAuthRealmEnabledSetInput, ApplicationAuthUpdateInput, ApplicationConsentMode, ApplicationCreateInput, ApplicationLifecycleStatus, ApplicationOAuthClientArchiveInput, ApplicationOAuthClientCreateInput, ApplicationOAuthClientEnabledSetInput, ApplicationOAuthClientEnvironment, ApplicationOAuthClientOrderByInput, ApplicationOAuthClientOrderField, ApplicationOAuthClientSecretRotateInput, ApplicationOAuthClientSkipConsentSetInput, ApplicationOAuthClientType, ApplicationOAuthClientUpdateInput, ApplicationOAuthClientWhereInput, ApplicationOAuthTokenEndpointAuthMethod, ApplicationOrderByInput, ApplicationOrderField, ApplicationRegistrationMode, ApplicationUpdateInput, ApplicationUserAccountUnlinkInput, ApplicationUserOrderByInput, ApplicationUserOrderField, ApplicationUserSessionsRevokeAllInput, ApplicationUserStatus, ApplicationUserStatusSetInput, ApplicationUserWhereInput, ApplicationWhereInput, AuthorizeInput, CurrencyCode, DateTimeFilter, DimensionUnit, IdFilter, LocaleCode, MemberAccessRemoveInput, MemberInviteInput, MemberRemoveInput, MemberRoleChangeInput, OrganizationCreateInput, OrganizationOrderByInput, OrganizationOrderField, OrganizationUpdateInput, OrganizationWhereInput, OwnershipTransferInput, ResourceManagementMode, RoleAssignment, RoleCreateInput, RoleDeleteInput, RolePermissionInput, RoleUpdateInput, SessionRevokeInput, SortDirection, StringFilter, UserSignInInput, UserSignOutInput, UserSignUpInput, UserTokenRefreshInput, UserUpdateEmailInput, UserUpdatePasswordInput, UserUpdateProfileInput, WeightUnit } from './types.js'

type Properties<T> = Required<{
  [K in keyof T]: z.ZodType<T[K], any, T[K]>;
}>;

type definedNonNullAny = {};

export const isDefinedNonNullAny = (v: any): v is definedNonNullAny => v !== undefined && v !== null;

export const definedNonNullAnySchema = z.any().refine((v) => isDefinedNonNullAny(v));

export const ActionSchema = z.nativeEnum(Action);

export const ApplicationAuthBackgroundColorSchema = z.nativeEnum(ApplicationAuthBackgroundColor);

export const ApplicationAuthMethodCapabilitySchema = z.nativeEnum(ApplicationAuthMethodCapability);

export const ApplicationAuthPrimaryColorSchema = z.nativeEnum(ApplicationAuthPrimaryColor);

export const ApplicationAuthProviderNameSchema = z.nativeEnum(ApplicationAuthProviderName);

export const ApplicationAuthProviderValidationStatusSchema = z.nativeEnum(ApplicationAuthProviderValidationStatus);

export const ApplicationConsentModeSchema = z.nativeEnum(ApplicationConsentMode);

export const ApplicationLifecycleStatusSchema = z.nativeEnum(ApplicationLifecycleStatus);

export const ApplicationOAuthClientEnvironmentSchema = z.nativeEnum(ApplicationOAuthClientEnvironment);

export const ApplicationOAuthClientOrderFieldSchema = z.nativeEnum(ApplicationOAuthClientOrderField);

export const ApplicationOAuthClientTypeSchema = z.nativeEnum(ApplicationOAuthClientType);

export const ApplicationOAuthTokenEndpointAuthMethodSchema = z.nativeEnum(ApplicationOAuthTokenEndpointAuthMethod);

export const ApplicationOrderFieldSchema = z.nativeEnum(ApplicationOrderField);

export const ApplicationRegistrationModeSchema = z.nativeEnum(ApplicationRegistrationMode);

export const ApplicationUserOrderFieldSchema = z.nativeEnum(ApplicationUserOrderField);

export const ApplicationUserStatusSchema = z.nativeEnum(ApplicationUserStatus);

export const CurrencyCodeSchema = z.nativeEnum(CurrencyCode);

export const DimensionUnitSchema = z.nativeEnum(DimensionUnit);

export const LocaleCodeSchema = z.nativeEnum(LocaleCode);

export const OrganizationOrderFieldSchema = z.nativeEnum(OrganizationOrderField);

export const ResourceManagementModeSchema = z.nativeEnum(ResourceManagementMode);

export const SortDirectionSchema = z.nativeEnum(SortDirection);

export const WeightUnitSchema = z.nativeEnum(WeightUnit);

export function ApplicationArchiveInputSchema(): z.ZodObject<Properties<ApplicationArchiveInput>> {
  return z.object({
    applicationId: z.string(),
    expectedRevision: z.number(),
    organizationId: z.string()
  })
}

export function ApplicationAuthBrandingInputSchema(): z.ZodObject<Properties<ApplicationAuthBrandingInput>> {
  return z.object({
    backgroundColor: ApplicationAuthBackgroundColorSchema.nullish(),
    displayName: z.string().nullish(),
    headline: z.string().nullish(),
    logoUrl: z.string().nullish(),
    primaryColor: ApplicationAuthPrimaryColorSchema.nullish()
  })
}

export function ApplicationAuthEmailDeliveryInputSchema(): z.ZodObject<Properties<ApplicationAuthEmailDeliveryInput>> {
  return z.object({
    emailOtpSignInTemplateId: z.string(),
    emailVerificationTemplateId: z.string(),
    passwordResetTemplateId: z.string(),
    senderIdentity: z.string(),
    transportProfile: z.string()
  })
}

export function ApplicationAuthMethodUpdateInputSchema(): z.ZodObject<Properties<ApplicationAuthMethodUpdateInput>> {
  return z.object({
    applicationId: z.string(),
    enabledCapabilities: z.array(ApplicationAuthMethodCapabilitySchema),
    expectedRevision: z.number(),
    methodId: definedNonNullAnySchema,
    organizationId: z.string()
  })
}

export function ApplicationAuthProviderConfigureInputSchema(): z.ZodObject<Properties<ApplicationAuthProviderConfigureInput>> {
  return z.object({
    applicationId: z.string(),
    clientId: z.string(),
    clientSecret: z.string(),
    expectedRevision: z.number(),
    organizationId: z.string(),
    provider: ApplicationAuthProviderNameSchema,
    scopes: z.array(z.string())
  })
}

export function ApplicationAuthProviderCredentialsDeleteInputSchema(): z.ZodObject<Properties<ApplicationAuthProviderCredentialsDeleteInput>> {
  return z.object({
    applicationId: z.string(),
    expectedRevision: z.number(),
    organizationId: z.string(),
    provider: ApplicationAuthProviderNameSchema
  })
}

export function ApplicationAuthProviderCredentialsRotateInputSchema(): z.ZodObject<Properties<ApplicationAuthProviderCredentialsRotateInput>> {
  return z.object({
    applicationId: z.string(),
    clientId: z.string(),
    clientSecret: z.string(),
    expectedRevision: z.number(),
    organizationId: z.string(),
    provider: ApplicationAuthProviderNameSchema
  })
}

export function ApplicationAuthProviderUpdateInputSchema(): z.ZodObject<Properties<ApplicationAuthProviderUpdateInput>> {
  return z.object({
    applicationId: z.string(),
    enabled: z.boolean().nullish(),
    expectedRevision: z.number(),
    organizationId: z.string(),
    provider: ApplicationAuthProviderNameSchema,
    scopes: z.array(z.string()).nullish()
  })
}

export function ApplicationAuthProviderValidateInputSchema(): z.ZodObject<Properties<ApplicationAuthProviderValidateInput>> {
  return z.object({
    applicationId: z.string(),
    expectedRevision: z.number(),
    organizationId: z.string(),
    provider: ApplicationAuthProviderNameSchema
  })
}

export function ApplicationAuthRealmEnabledSetInputSchema(): z.ZodObject<Properties<ApplicationAuthRealmEnabledSetInput>> {
  return z.object({
    applicationId: z.string(),
    enabled: z.boolean(),
    expectedRevision: z.number(),
    organizationId: z.string()
  })
}

export function ApplicationAuthUpdateInputSchema(): z.ZodObject<Properties<ApplicationAuthUpdateInput>> {
  return z.object({
    accessTokenTtlSeconds: z.number().nullish(),
    applicationId: z.string(),
    branding: z.lazy(() => ApplicationAuthBrandingInputSchema().nullish()),
    defaultLocale: LocaleCodeSchema.nullish(),
    emailDelivery: z.lazy(() => ApplicationAuthEmailDeliveryInputSchema().nullish()),
    emailVerificationRequired: z.boolean().nullish(),
    expectedRevision: z.number(),
    idTokenTtlSeconds: z.number().nullish(),
    organizationId: z.string(),
    refreshTokenTtlSeconds: z.number().nullish(),
    registrationMode: ApplicationRegistrationModeSchema.nullish(),
    sessionTtlSeconds: z.number().nullish(),
    trustedOrigins: z.array(z.string()).nullish()
  })
}

export function ApplicationCreateInputSchema(): z.ZodObject<Properties<ApplicationCreateInput>> {
  return z.object({
    description: z.string().nullish(),
    displayName: z.string(),
    name: z.string(),
    organizationId: z.string()
  })
}

export function ApplicationOAuthClientArchiveInputSchema(): z.ZodObject<Properties<ApplicationOAuthClientArchiveInput>> {
  return z.object({
    applicationId: z.string(),
    clientId: z.string(),
    expectedRevision: z.number(),
    organizationId: z.string()
  })
}

export function ApplicationOAuthClientCreateInputSchema(): z.ZodObject<Properties<ApplicationOAuthClientCreateInput>> {
  return z.object({
    applicationId: z.string(),
    clientType: ApplicationOAuthClientTypeSchema,
    enableEndSession: z.boolean().nullish(),
    environment: ApplicationOAuthClientEnvironmentSchema,
    name: z.string(),
    organizationId: z.string(),
    postLogoutRedirectUris: z.array(z.string()).nullish(),
    redirectUris: z.array(z.string()),
    skipConsent: z.boolean().nullish()
  })
}

export function ApplicationOAuthClientEnabledSetInputSchema(): z.ZodObject<Properties<ApplicationOAuthClientEnabledSetInput>> {
  return z.object({
    applicationId: z.string(),
    clientId: z.string(),
    enabled: z.boolean(),
    expectedRevision: z.number(),
    organizationId: z.string()
  })
}

export function ApplicationOAuthClientOrderByInputSchema(): z.ZodObject<Properties<ApplicationOAuthClientOrderByInput>> {
  return z.object({
    direction: SortDirectionSchema,
    field: ApplicationOAuthClientOrderFieldSchema
  })
}

export function ApplicationOAuthClientSecretRotateInputSchema(): z.ZodObject<Properties<ApplicationOAuthClientSecretRotateInput>> {
  return z.object({
    applicationId: z.string(),
    clientId: z.string(),
    expectedRevision: z.number(),
    organizationId: z.string()
  })
}

export function ApplicationOAuthClientSkipConsentSetInputSchema(): z.ZodObject<Properties<ApplicationOAuthClientSkipConsentSetInput>> {
  return z.object({
    applicationId: z.string(),
    clientId: z.string(),
    expectedRevision: z.number(),
    organizationId: z.string(),
    skipConsent: z.boolean()
  })
}

export function ApplicationOAuthClientUpdateInputSchema(): z.ZodObject<Properties<ApplicationOAuthClientUpdateInput>> {
  return z.object({
    applicationId: z.string(),
    clientId: z.string(),
    enableEndSession: z.boolean().nullish(),
    environment: ApplicationOAuthClientEnvironmentSchema.nullish(),
    expectedRevision: z.number(),
    name: z.string().nullish(),
    organizationId: z.string(),
    postLogoutRedirectUris: z.array(z.string()).nullish(),
    redirectUris: z.array(z.string()).nullish()
  })
}

export function ApplicationOAuthClientWhereInputSchema(): z.ZodObject<Properties<ApplicationOAuthClientWhereInput>> {
  return z.object({
    archived: z.boolean().nullish(),
    clientType: z.array(ApplicationOAuthClientTypeSchema).nullish(),
    disabled: z.boolean().nullish(),
    environment: z.array(ApplicationOAuthClientEnvironmentSchema).nullish(),
    search: z.string().nullish()
  })
}

export function ApplicationOrderByInputSchema(): z.ZodObject<Properties<ApplicationOrderByInput>> {
  return z.object({
    direction: SortDirectionSchema,
    field: ApplicationOrderFieldSchema
  })
}

export function ApplicationUpdateInputSchema(): z.ZodObject<Properties<ApplicationUpdateInput>> {
  return z.object({
    applicationId: z.string(),
    description: z.string().nullish(),
    displayName: z.string().nullish(),
    expectedRevision: z.number(),
    name: z.string().nullish(),
    organizationId: z.string()
  })
}

export function ApplicationUserAccountUnlinkInputSchema(): z.ZodObject<Properties<ApplicationUserAccountUnlinkInput>> {
  return z.object({
    accountId: z.string(),
    applicationId: z.string(),
    organizationId: z.string(),
    userId: z.string()
  })
}

export function ApplicationUserOrderByInputSchema(): z.ZodObject<Properties<ApplicationUserOrderByInput>> {
  return z.object({
    direction: SortDirectionSchema,
    field: ApplicationUserOrderFieldSchema
  })
}

export function ApplicationUserSessionsRevokeAllInputSchema(): z.ZodObject<Properties<ApplicationUserSessionsRevokeAllInput>> {
  return z.object({
    applicationId: z.string(),
    organizationId: z.string(),
    userId: z.string()
  })
}

export function ApplicationUserStatusSetInputSchema(): z.ZodObject<Properties<ApplicationUserStatusSetInput>> {
  return z.object({
    applicationId: z.string(),
    organizationId: z.string(),
    userId: z.string()
  })
}

export function ApplicationUserWhereInputSchema(): z.ZodObject<Properties<ApplicationUserWhereInput>> {
  return z.object({
    emailVerified: z.boolean().nullish(),
    search: z.string().nullish(),
    status: z.array(ApplicationUserStatusSchema).nullish()
  })
}

export function ApplicationWhereInputSchema(): z.ZodObject<Properties<ApplicationWhereInput>> {
  return z.object({
    search: z.string().nullish(),
    status: z.array(ApplicationLifecycleStatusSchema).nullish()
  })
}

export function AuthorizeInputSchema(): z.ZodObject<Properties<AuthorizeInput>> {
  return z.object({
    action: z.string(),
    domain: z.string(),
    organizationId: z.string(),
    resource: z.string()
  })
}

export function DateTimeFilterSchema(): z.ZodObject<Properties<DateTimeFilter>> {
  return z.object({
    _eq: z.string().nullish(),
    _gt: z.string().nullish(),
    _gte: z.string().nullish(),
    _is: z.boolean().nullish(),
    _isNot: z.boolean().nullish(),
    _lt: z.string().nullish(),
    _lte: z.string().nullish(),
    _neq: z.string().nullish()
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

export function MemberAccessRemoveInputSchema(): z.ZodObject<Properties<MemberAccessRemoveInput>> {
  return z.object({
    domain: z.string(),
    organizationId: z.string(),
    userId: z.string()
  })
}

export function MemberInviteInputSchema(): z.ZodObject<Properties<MemberInviteInput>> {
  return z.object({
    email: z.string().email(),
    organizationId: z.string(),
    roles: z.array(z.lazy(() => RoleAssignmentSchema()))
  })
}

export function MemberRemoveInputSchema(): z.ZodObject<Properties<MemberRemoveInput>> {
  return z.object({
    organizationId: z.string(),
    userId: z.string()
  })
}

export function MemberRoleChangeInputSchema(): z.ZodObject<Properties<MemberRoleChangeInput>> {
  return z.object({
    domain: z.string(),
    organizationId: z.string(),
    role: z.string(),
    userId: z.string()
  })
}

export function OrganizationCreateInputSchema(): z.ZodObject<Properties<OrganizationCreateInput>> {
  return z.object({
    displayName: z.string(),
    name: z.string()
  })
}

export function OrganizationOrderByInputSchema(): z.ZodObject<Properties<OrganizationOrderByInput>> {
  return z.object({
    direction: SortDirectionSchema,
    field: OrganizationOrderFieldSchema
  })
}

export function OrganizationUpdateInputSchema(): z.ZodObject<Properties<OrganizationUpdateInput>> {
  return z.object({
    displayName: z.string().nullish(),
    id: z.string(),
    logoId: z.string().nullish(),
    name: z.string().nullish()
  })
}

export function OrganizationWhereInputSchema(): z.ZodObject<Properties<OrganizationWhereInput>> {
  return z.object({
    _and: z.array(z.lazy(() => OrganizationWhereInputSchema())).nullish(),
    _not: z.lazy(() => OrganizationWhereInputSchema().nullish()),
    _or: z.array(z.lazy(() => OrganizationWhereInputSchema())).nullish(),
    createdAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    displayName: z.lazy(() => StringFilterSchema().nullish()),
    id: z.lazy(() => IdFilterSchema().nullish()),
    name: z.lazy(() => StringFilterSchema().nullish()),
    updatedAt: z.lazy(() => DateTimeFilterSchema().nullish())
  })
}

export function OwnershipTransferInputSchema(): z.ZodObject<Properties<OwnershipTransferInput>> {
  return z.object({
    newOwnerId: z.string(),
    organizationId: z.string()
  })
}

export function RoleAssignmentSchema(): z.ZodObject<Properties<RoleAssignment>> {
  return z.object({
    domain: z.string(),
    role: z.string()
  })
}

export function RoleCreateInputSchema(): z.ZodObject<Properties<RoleCreateInput>> {
  return z.object({
    description: z.string().nullish(),
    displayName: z.string(),
    domain: z.string(),
    name: z.string(),
    organizationId: z.string(),
    permissions: z.array(z.lazy(() => RolePermissionInputSchema()))
  })
}

export function RoleDeleteInputSchema(): z.ZodObject<Properties<RoleDeleteInput>> {
  return z.object({
    id: z.string(),
    organizationId: z.string()
  })
}

export function RolePermissionInputSchema(): z.ZodObject<Properties<RolePermissionInput>> {
  return z.object({
    action: ActionSchema,
    resource: z.string()
  })
}

export function RoleUpdateInputSchema(): z.ZodObject<Properties<RoleUpdateInput>> {
  return z.object({
    description: z.string().nullish(),
    displayName: z.string().nullish(),
    id: z.string(),
    organizationId: z.string(),
    permissions: z.array(z.lazy(() => RolePermissionInputSchema())).nullish()
  })
}

export function SessionRevokeInputSchema(): z.ZodObject<Properties<SessionRevokeInput>> {
  return z.object({
    sessionId: z.string()
  })
}

export function StringFilterSchema(): z.ZodObject<Properties<StringFilter>> {
  return z.object({
    _contains: z.string().nullish(),
    _containsi: z.string().nullish(),
    _eq: z.string().nullish(),
    _in: z.array(z.string()).nullish(),
    _is: z.boolean().nullish(),
    _isNot: z.boolean().nullish(),
    _neq: z.string().nullish(),
    _notIn: z.array(z.string()).nullish(),
    _startsWith: z.string().nullish(),
    _startsWithi: z.string().nullish()
  })
}

export function UserSignInInputSchema(): z.ZodObject<Properties<UserSignInInput>> {
  return z.object({
    email: z.string().email(),
    password: z.string()
  })
}

export function UserSignOutInputSchema(): z.ZodObject<Properties<UserSignOutInput>> {
  return z.object({
    allSessions: z.boolean().nullish()
  })
}

export function UserSignUpInputSchema(): z.ZodObject<Properties<UserSignUpInput>> {
  return z.object({
    email: z.string().email(),
    password: z.string()
  })
}

export function UserTokenRefreshInputSchema(): z.ZodObject<Properties<UserTokenRefreshInput>> {
  return z.object({
    refreshToken: z.string()
  })
}

export function UserUpdateEmailInputSchema(): z.ZodObject<Properties<UserUpdateEmailInput>> {
  return z.object({
    newEmail: z.string().email()
  })
}

export function UserUpdatePasswordInputSchema(): z.ZodObject<Properties<UserUpdatePasswordInput>> {
  return z.object({
    currentPassword: z.string(),
    newPassword: z.string()
  })
}

export function UserUpdateProfileInputSchema(): z.ZodObject<Properties<UserUpdateProfileInput>> {
  return z.object({
    avatarId: z.string().nullish(),
    firstName: z.string().nullish(),
    lastName: z.string().nullish(),
    locale: LocaleCodeSchema.nullish()
  })
}

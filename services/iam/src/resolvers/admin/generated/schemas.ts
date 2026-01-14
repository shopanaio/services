import { z } from 'zod'
import { Action, AuthorizeInput, CurrencyCode, DateTimeFilter, DimensionUnit, IdFilter, LocaleCode, MemberAccessRemoveInput, MemberInviteInput, MemberRemoveInput, MemberRoleChangeInput, OrganizationCreateInput, OrganizationOrderByInput, OrganizationOrderField, OrganizationUpdateInput, OrganizationWhereInput, OwnershipTransferInput, RoleAssignment, RoleCreateInput, RoleDeleteInput, RolePermissionInput, RoleUpdateInput, SessionRevokeInput, SortDirection, StringFilter, UserSignInInput, UserSignOutInput, UserSignUpInput, UserTokenRefreshInput, UserUpdateEmailInput, UserUpdatePasswordInput, UserUpdateProfileInput, WeightUnit } from './types.js'

type Properties<T> = Required<{
  [K in keyof T]: z.ZodType<T[K], any, T[K]>;
}>;

type definedNonNullAny = {};

export const isDefinedNonNullAny = (v: any): v is definedNonNullAny => v !== undefined && v !== null;

export const definedNonNullAnySchema = z.any().refine((v) => isDefinedNonNullAny(v));

export const ActionSchema = z.nativeEnum(Action);

export const CurrencyCodeSchema = z.nativeEnum(CurrencyCode);

export const DimensionUnitSchema = z.nativeEnum(DimensionUnit);

export const LocaleCodeSchema = z.nativeEnum(LocaleCode);

export const OrganizationOrderFieldSchema = z.nativeEnum(OrganizationOrderField);

export const SortDirectionSchema = z.nativeEnum(SortDirection);

export const WeightUnitSchema = z.nativeEnum(WeightUnit);

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
    firstName: z.string().nullish(),
    lastName: z.string().nullish(),
    locale: LocaleCodeSchema.nullish()
  })
}

import { z } from 'zod'
import { AuthorizeInput, CurrencyCode, DimensionUnit, LocaleCode, MemberAccessRemoveInput, MemberInviteInput, MemberRoleChangeInput, OrganizationCreateInput, OrganizationUpdateInput, RoleAssignment, RoleCreateInput, RoleDeleteInput, RolePermissionInput, RoleUpdateInput, UserSignInInput, UserSignOutInput, UserSignUpInput, UserTokenRefreshInput, UserUpdateEmailInput, UserUpdatePasswordInput, UserUpdateProfileInput, WeightUnit } from './types.js'

type Properties<T> = Required<{
  [K in keyof T]: z.ZodType<T[K], any, T[K]>;
}>;

type definedNonNullAny = {};

export const isDefinedNonNullAny = (v: any): v is definedNonNullAny => v !== undefined && v !== null;

export const definedNonNullAnySchema = z.any().refine((v) => isDefinedNonNullAny(v));

export const CurrencyCodeSchema = z.nativeEnum(CurrencyCode);

export const DimensionUnitSchema = z.nativeEnum(DimensionUnit);

export const LocaleCodeSchema = z.nativeEnum(LocaleCode);

export const WeightUnitSchema = z.nativeEnum(WeightUnit);

export function AuthorizeInputSchema(): z.ZodObject<Properties<AuthorizeInput>> {
  return z.object({
    action: z.string(),
    domain: z.string(),
    organizationId: z.string(),
    resource: z.string()
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

export function OrganizationUpdateInputSchema(): z.ZodObject<Properties<OrganizationUpdateInput>> {
  return z.object({
    name: z.string().nullish()
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
    actions: z.array(z.string()),
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

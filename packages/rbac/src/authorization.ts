import type { Action } from "./definitions.js";
import type { AuthorizeParams, Authorizer } from "./auth.js";
import {
  validateAuthorizeInput,
  type ResourceName,
} from "./validators.js";

/** Expanded permission embedded in a verified Admin Context snapshot. */
export interface AdminAuthorizationPermission {
  readonly domain: "org" | `store:${string}`;
  readonly resource: ResourceName;
  readonly action: Action;
}

/**
 * Structural subset shared by gateway Admin Context claims and broker
 * workflow preflight. It intentionally excludes JWT-specific fields.
 */
export interface AdminAuthorizationContext {
  readonly user: {
    readonly id: string;
  };
  readonly organizationId: string | null;
  readonly store: {
    readonly id: string;
    readonly organizationId: string;
  } | null;
  readonly permissions: readonly AdminAuthorizationPermission[];
  readonly isSiteAdmin: boolean;
  readonly isOrganizationOwner: boolean;
}

export interface AdminContextAuthorizeInput extends AuthorizeParams {
  readonly domain: string;
}

type AdminPermissionContext = Pick<
  AdminAuthorizationContext,
  "permissions" | "isSiteAdmin" | "isOrganizationOwner"
>;

/** Evaluate only the RBAC permission portion of an Admin Context snapshot. */
export function adminContextAllows(
  context: AdminPermissionContext,
  input: {
    readonly domain: string;
    readonly resource: string;
    readonly action: string;
  },
): boolean {
  const validated = validateAuthorizeInput(input);
  if (!validated.success) return false;
  if (context.isSiteAdmin || context.isOrganizationOwner) return true;

  return context.permissions.some(
    (permission) =>
      permission.domain === validated.data.domain &&
      permission.resource === validated.data.resource &&
      permission.action === validated.data.action,
  );
}

/**
 * Authorize against a verified Admin Context snapshot.
 *
 * This function is pure: it does not read ALS, JWTs, repositories or broker
 * state. Callers are responsible for supplying a verified context.
 */
export function authorizeAdminContext(
  context: AdminAuthorizationContext | undefined,
  input: AdminContextAuthorizeInput,
): boolean {
  if (!context) return false;

  const subject = input.subject ?? context.user.id;
  if (subject !== context.user.id) return false;

  if (
    !context.organizationId ||
    input.organizationName !== undefined ||
    (input.organizationId !== undefined &&
      input.organizationId !== context.organizationId)
  ) {
    return false;
  }

  if (
    context.store &&
    context.store.organizationId !== context.organizationId
  ) {
    return false;
  }

  if (
    input.domain !== "org" &&
    (!context.store || input.domain !== `store:${context.store.id}`)
  ) {
    return false;
  }

  return adminContextAllows(context, input);
}

/**
 * Authorizer adapter for a verified, immutable Admin Context snapshot.
 *
 * Missing domains and organization-name scopes fail closed. IAM is the only
 * authorizer that may resolve organization names.
 */
export class AdminContextAuthorizer implements Authorizer {
  constructor(private readonly context: AdminAuthorizationContext) {}

  async authorize(params: AuthorizeParams): Promise<boolean> {
    if (!params.domain) return false;
    return authorizeAdminContext(this.context, {
      ...params,
      domain: params.domain,
    });
  }
}

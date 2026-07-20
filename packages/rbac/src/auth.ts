/**
 * Authorization interfaces and types for RBAC.
 * Used by @Policy and @TypePolicy decorators.
 */
import type { Domain } from "./types.js";
import type { ResourceName } from "./validators.js";
import { Resources } from "./definitions.js";

// ============ Resource and Action Types ============

/** Extract action type for a specific resource */
export type ActionsForResource<R extends ResourceName> = R extends keyof typeof Resources.org
  ? (typeof Resources.org)[R]["actions"][number]
  : R extends keyof typeof Resources.store
    ? (typeof Resources.store)[R]["actions"][number]
    : string;

// ============ Authorization Interfaces ============

/**
 * Parameters for authorization check.
 */
export interface ProtectedResourceRef {
  organizationId: string;
  resourceKind: string;
  resourceId: string;
  ownerId?: string;
}

export interface LinkedOwnerRef extends ProtectedResourceRef {
  linkedService: string;
  linkedOwnerType: string;
  linkedOwnerId: string;
}

export interface ServiceLinkedAuthorizationDetails {
  organizationId: string;
  resourceKind: string;
  resourceId: string;
  linkedService: string;
  linkedOwnerType: string;
  linkedOwnerId: string;
}

export interface BrokerAuthorizeParams {
  subject?: string;
  organizationId?: string;
  organizationName?: string;
  domain?: string;
  resource: string;
  action: string;
  protectedResource?: ProtectedResourceRef;
}

export type AuthorizeParams = BrokerAuthorizeParams;

export class ServiceLinkedResourceAuthorizationError extends Error {
  readonly code = "RESOURCE_SERVICE_LINKED";

  constructor(
    public readonly details: ServiceLinkedAuthorizationDetails,
    message = "Resource is managed by linked service"
  ) {
    super(message);
    this.name = "ServiceLinkedResourceAuthorizationError";
  }
}

/**
 * Interface for authorization provider.
 * Contains subject (current user) and authorize method.
 */
export interface AuthProvider {
  /** Current subject (user ID) for authorization checks. */
  subject: string | null;
  authorize(params: AuthorizeParams): Promise<boolean>;
}

/**
 * Interface that a class must implement to use @Policy decorator.
 * Uses composition via `authProvider` property.
 */
export interface Authorizable {
  authProvider: AuthProvider;
}

// ============ Policy Options Base ============

/**
 * Base policy options shared by @Policy and @TypePolicy decorators.
 *
 * @template R - Resource type (typed to valid resources from @shopana/rbac)
 */
export interface BasePolicyOptions<R extends ResourceName = ResourceName> {
  /** Resource to check authorization for (from @shopana/rbac) */
  resource: R;
  /** Action to check (validated against resource's allowed actions) */
  action: ActionsForResource<R>;
}

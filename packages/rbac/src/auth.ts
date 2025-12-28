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
export interface AuthorizeParams {
  resource: string;
  action: string;
  organizationId?: string;
  organizationName?: string;
  domain?: string;
  /** Subject (user ID) for authorization. */
  subject?: string;
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

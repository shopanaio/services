// Re-export common types from shared-kernel
export type {
  AuthorizeParams,
  AuthProvider,
  Authorizable,
} from "@shopana/shared-kernel";

import type { ResourceName, Domain } from "@shopana/rbac";
import { Resources } from "@shopana/rbac";

// ============ Resource and Action Types ============

/** Extract action type for a specific resource */
type ActionsForResource<R extends ResourceName> = R extends keyof typeof Resources.org
  ? (typeof Resources.org)[R]["actions"][number]
  : R extends keyof typeof Resources.store
    ? (typeof Resources.store)[R]["actions"][number]
    : string;

/**
 * Policy options for @TypePolicy decorator on type resolvers.
 *
 * @template TSelf - Type of the resolver instance
 * @template R - Resource type (typed to valid resources from @shopana/rbac)
 */
export interface TypePolicyOptions<TSelf = unknown, R extends ResourceName = ResourceName> {
  /** Resource to check authorization for (from @shopana/rbac) */
  resource: R;
  /** Action to check (validated against resource's allowed actions) */
  action: ActionsForResource<R>;
  /**
   * Organization ID for authorization.
   * Can be a string or a function that extracts it from resolver instance.
   */
  organizationId: string | ((self: TSelf) => string | null);
  /**
   * Domain scope (e.g., "store:uuid", "org").
   * Can be a string or a function that extracts it from resolver instance.
   */
  domain?: Domain | ((self: TSelf) => Domain | string);
  /** User ID for authorization. */
  userId?: string | ((self: TSelf) => string | null);
  /** Behavior when authorization fails: 'throw' (default) or 'null' */
  onDeny?: "throw" | "null";
}

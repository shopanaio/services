// Re-export common types from rbac
export type {
  AuthorizeParams,
  AuthProvider,
  Authorizable,
} from "@shopana/rbac";

import type {
  ResourceName,
  Domain,
  ActionsForResource,
} from "@shopana/rbac";

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
  /** Subject (user ID) for authorization. */
  subject?: string | ((self: TSelf) => string | null);
  /** Behavior when authorization fails: 'throw' (default) or 'null' */
  onDeny?: "throw" | "null";
}

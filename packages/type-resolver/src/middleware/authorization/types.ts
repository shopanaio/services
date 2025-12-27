// Re-export common types from shared-kernel
export type {
  AuthorizeParams,
  AuthProvider,
  Authorizable,
} from "@shopana/shared-kernel";

/**
 * Policy options for @TypePolicy decorator on type resolvers.
 *
 * @template TSelf - Type of the resolver instance
 */
export interface TypePolicyOptions<TSelf = unknown> {
  /** Resource to check authorization for */
  resource: string;
  /** Action to check (e.g., "read", "write", "delete", "create") */
  action: string;
  /**
   * Organization ID for authorization.
   * Can be a string or a function that extracts it from resolver instance.
   */
  organizationId: string | ((self: TSelf) => string | null);
  /**
   * Domain scope (e.g., "store:123", "org").
   * Can be a string or a function that extracts it from resolver instance.
   */
  domain?: string | ((self: TSelf) => string);
  /** User ID for authorization. */
  userId?: string | ((self: TSelf) => string | null);
  /** Behavior when authorization fails: 'throw' (default) or 'null' */
  onDeny?: "throw" | "null";
}

/**
 * Policy options for @TypePolicy decorator on type resolvers.
 * Same structure as @Policy in shared-kernel but for resolvers.
 *
 * All fields accept either a static value or a function that resolves the value.
 *
 * @template TSelf - Type of the resolver instance
 */
export interface TypePolicyOptions<TSelf = unknown> {
  /** Resource to check authorization for */
  resource: string;
  /** Action to check (e.g., "read", "write", "delete", "create") */
  action: string;
  /**
   * Organization ID for authorization - required.
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

/**
 * Parameters passed to authorize method.
 * Same structure as AuthorizeParams in shared-kernel.
 */
export interface AuthorizeParams {
  resource: string;
  action: string;
  organizationId: string;
  domain?: string;
  userId?: string;
}

/**
 * Interface for authorization provider.
 * Contains userId and authorize method.
 */
export interface AuthProvider {
  userId: string | null;
  authorize(params: AuthorizeParams): Promise<boolean>;
}

/**
 * Interface for types that support authorization.
 * Uses composition via `auth` property.
 */
export interface Authorizable {
  authProvider: AuthProvider;
}

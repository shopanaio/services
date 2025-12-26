/**
 * Authorization policy options for type resolvers.
 * Used by @TypePolicy decorator and authorization middleware.
 *
 * @template TSelf - Type of the resolver instance for typed domain function
 */
export interface TypePolicyOptions<TSelf = unknown> {
  /** Resource to check authorization for */
  resource: string;
  /** Action to check (e.g., "read", "write", "delete") */
  action: string;
  /** Behavior when authorization fails: 'throw' (default) or 'null' */
  onDeny?: "throw" | "null";
  /**
   * Domain for authorization (e.g., "store:123").
   * Can be a string or a function that receives the resolver instance.
   */
  domain?: string | ((resolver: TSelf) => string);
}

/**
 * Parameters passed to authorize method.
 */
export interface AuthorizeParams {
  resource: string;
  action: string;
  domain?: string;
}

/**
 * Interface for types that support authorization.
 * Implement this in your base resolver class.
 */
export interface Authorizable {
  authorize(params: AuthorizeParams): Promise<boolean>;
}

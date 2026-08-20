/**
 * Error thrown when authorization fails and onDeny is 'throw'.
 */
export class TypeAuthorizationError extends Error {
  constructor(
    public readonly resource: string,
    public readonly action: string,
  ) {
    super(`Access denied: ${resource}:${action}`);
    this.name = "TypeAuthorizationError";
  }
}

/**
 * Error thrown when @TypePolicy is configured on a resolver that cannot
 * perform authorization.
 */
export class TypeAuthorizationConfigurationError extends Error {
  constructor(public readonly typeName: string) {
    super(
      `@TypePolicy on ${typeName || "anonymous type"} requires an authProvider implementing Authorizer`,
    );
    this.name = "TypeAuthorizationConfigurationError";
  }
}

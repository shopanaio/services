/**
 * Error thrown when authorization fails and onDeny is 'throw'.
 */
export class TypeAuthorizationError extends Error {
  constructor(
    public readonly resource: string,
    public readonly action: string
  ) {
    super(`Access denied: ${resource}:${action}`);
    this.name = "TypeAuthorizationError";
  }
}

import type { UserError } from "./ZodSchema.js";

/**
 * Authorization error thrown when access is denied
 */
export class AuthorizationError extends Error {
  constructor(
    public readonly errors: UserError[],
    public readonly resource: string,
    public readonly action: string
  ) {
    super(`Access denied: ${resource}:${action}`);
    this.name = "AuthorizationError";
  }
}

export interface AuthorizeOptions {
  resource: string;
  action: string;
}

export interface AuthorizeParams {
  resource: string;
  action: string;
  organizationId: string;
}

export interface AuthorizeResult {
  allowed: boolean;
  deniedReason?: string;
}

/**
 * Interface that a class must implement to use @Authorize decorator
 */
export interface Authorizable {
  userId: string | null;
  organizationId: string | null;
  authorize(params: AuthorizeParams): Promise<AuthorizeResult>;
}

/**
 * Method decorator that checks authorization before executing.
 * The class must have:
 * - `this.userId` - current user ID
 * - `this.organizationId` - organization ID for authorization
 * - `this.authorize({ resource, action })` - method to check permission
 *
 * @param options - Authorization options (resource, action)
 *
 * @example
 * class StoreCreateScript extends BaseScript {
 *   @Authorize({ resource: "store", action: "create" })
 *   protected async execute(params: StoreCreateParams) { ... }
 * }
 */
export function Authorize(options: AuthorizeOptions) {
  return function <T>(
    _target: object,
    _propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<T>
  ): TypedPropertyDescriptor<T> {
    const originalMethod = descriptor.value as unknown as (
      params: unknown
    ) => Promise<unknown>;

    descriptor.value = async function (
      this: Authorizable,
      params: unknown
    ): Promise<unknown> {
      if (!this.userId) {
        throw new AuthorizationError(
          [{ code: "UNAUTHENTICATED", message: "Authentication required", field: null }],
          options.resource,
          options.action
        );
      }

      if (!this.organizationId) {
        throw new AuthorizationError(
          [{ code: "UNAUTHORIZED", message: "Organization context required", field: null }],
          options.resource,
          options.action
        );
      }

      const result = await this.authorize({
        resource: options.resource,
        action: options.action,
        organizationId: this.organizationId,
      });

      if (!result.allowed) {
        throw new AuthorizationError(
          [{ code: "FORBIDDEN", message: result.deniedReason ?? `Access denied: ${options.resource}:${options.action}`, field: null }],
          options.resource,
          options.action
        );
      }

      return originalMethod.call(this, params);
    } as unknown as T;

    return descriptor;
  };
}

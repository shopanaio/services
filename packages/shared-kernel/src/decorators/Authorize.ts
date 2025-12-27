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

/**
 * Policy options for @Policy decorator on script methods.
 * All fields accept either a static value or a function that resolves the value.
 *
 * @template TParams - Type of the script params
 * @template TSelf - Type of the script instance
 */
export interface AuthorizeOptions<
  TParams = unknown,
  TSelf extends Authorizable = Authorizable
> {
  /** Resource to check authorization for */
  resource: string;
  /** Action to check (e.g., "read", "write", "delete", "create") */
  action: string;
  /**
   * Organization ID for authorization.
   */
  organizationId?: string | ((self: TSelf, params: TParams) => string);
  /**
   * Organization slug (name) for authorization.
   * Will be resolved to organization ID via resolveOrganizationId().
   * Use this OR organizationId, not both.
   */
  organizationName?: string | ((self: TSelf, params: TParams) => string);
  /**
   * Domain scope (e.g., "store:123", "org").
   * Can be a string or a function that extracts it from instance/params.
   */
  domain?: string | ((self: TSelf, params: TParams) => string);
}

export interface AuthorizeParams {
  resource: string;
  action: string;
  organizationId?: string;
  organizationName?: string;
  domain?: string;
}

/**
 * Interface that a class must implement to use @Authorize decorator
 */
export interface Authorizable {
  userId: string | null;
  authorize(params: AuthorizeParams): Promise<boolean>;
}

type PolicyDecorator = <T>(
  _target: object,
  _propertyKey: string | symbol,
  descriptor: TypedPropertyDescriptor<T>
) => TypedPropertyDescriptor<T>;

/**
 * Method decorator that checks authorization before executing.
 * The class must have:
 * - `this.userId` - current user ID
 * - `this.authorize({ resource, action, organizationId })` - method to check permission
 *
 * @param options - Authorization options (resource, action, organizationId)
 *
 * @example
 * class AssignRoleScript extends BaseScript {
 *   @Policy<AssignRoleParams>({
 *     resource: "org.roles",
 *     action: "update",
 *     organizationId: (_, params) => params.organizationId
 *   })
 *   protected async execute(params: AssignRoleParams) { ... }
 * }
 */
export function Policy<TParams>(
  options: AuthorizeOptions<TParams>
): PolicyDecorator;
export function Policy<TParams, TSelf extends Authorizable>(
  options: AuthorizeOptions<TParams, TSelf>
): PolicyDecorator;
export function Policy<
  TParams = unknown,
  TSelf extends Authorizable = Authorizable
>(options: AuthorizeOptions<TParams, TSelf>): PolicyDecorator {
  return function <T>(
    _target: object,
    _propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<T>
  ): TypedPropertyDescriptor<T> {
    const originalMethod = descriptor.value as unknown as (
      params: TParams
    ) => Promise<unknown>;

    descriptor.value = async function (
      this: TSelf,
      params: TParams
    ): Promise<unknown> {
      if (!this.userId) {
        throw new AuthorizationError(
          [
            {
              code: "UNAUTHENTICATED",
              message: "Authentication required",
              field: null,
            },
          ],
          options.resource,
          options.action
        );
      }

      const organizationId =
        typeof options.organizationId === "function"
          ? options.organizationId(this, params)
          : options.organizationId;

      const organizationName =
        typeof options.organizationName === "function"
          ? options.organizationName(this, params)
          : options.organizationName;

      const domain =
        typeof options.domain === "function"
          ? options.domain(this, params)
          : options.domain;

      const allowed = await this.authorize({
        resource: options.resource,
        action: options.action,
        organizationId: organizationId,
        organizationName: organizationName,
        domain,
      });

      if (!allowed) {
        throw new AuthorizationError(
          [
            {
              code: "FORBIDDEN",
              message: `Access denied: ${options.resource}:${options.action}`,
              field: null,
            },
          ],
          options.resource,
          options.action
        );
      }

      return originalMethod.call(this, params);
    } as unknown as T;

    return descriptor;
  };
}

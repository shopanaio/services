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

export interface AuthorizeOptions<TParams = unknown, TSelf extends Authorizable = Authorizable> {
  resource: string;
  action: string;
  /** Domain scope (e.g., "store:123"). Defaults to "org" */
  domain?: string | ((self: TSelf, params: TParams) => string);
  /** Organization ID - required. Can be a string or a function that extracts it from params */
  organizationId: string | ((self: TSelf, params: TParams) => string);
}

export interface AuthorizeParams {
  resource: string;
  action: string;
  organizationId: string;
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
export function Policy<TParams>(options: AuthorizeOptions<TParams>): PolicyDecorator;
export function Policy<TParams, TSelf extends Authorizable>(
  options: AuthorizeOptions<TParams, TSelf>
): PolicyDecorator;
export function Policy<TParams = unknown, TSelf extends Authorizable = Authorizable>(
  options: AuthorizeOptions<TParams, TSelf>
): PolicyDecorator {
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

      // Resolve organizationId from options (string or function)
      const organizationId =
        typeof options.organizationId === "function"
          ? options.organizationId(this, params)
          : options.organizationId;

      const allowed = await this.authorize({
        resource: options.resource,
        action: options.action,
        organizationId,
        domain:
          typeof options.domain === "function"
            ? options.domain(this, params)
            : options.domain,
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

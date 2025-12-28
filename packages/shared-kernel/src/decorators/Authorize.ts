import type { UserError } from "./ZodSchema.js";
import type {
  ResourceName,
  Domain,
  ActionsForResource,
  Authorizable,
} from "@shopana/rbac";

// Re-export from rbac for backwards compatibility
export type { AuthorizeParams, AuthProvider, Authorizable } from "@shopana/rbac";

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
 * @template R - Resource type (typed to valid resources from @shopana/rbac)
 */
export interface AuthorizeOptions<
  TParams = unknown,
  TSelf extends Authorizable = Authorizable,
  R extends ResourceName = ResourceName
> {
  /** Resource to check authorization for (from @shopana/rbac) */
  resource: R;
  /** Action to check (validated against resource's allowed actions) */
  action: ActionsForResource<R>;
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
   * Domain scope (e.g., "store:uuid", "org").
   * Can be a string or a function that extracts it from instance/params.
   */
  domain?: Domain | ((self: TSelf, params: TParams) => Domain | string);
  /** User ID for authorization. */
  userId?: string | ((self: TSelf, params: TParams) => string);
}

type PolicyDecorator = <T>(
  _target: object,
  _propertyKey: string | symbol,
  descriptor: TypedPropertyDescriptor<T>
) => TypedPropertyDescriptor<T>;

/**
 * Method decorator that checks authorization before executing.
 * The class must implement Authorizable interface with authProvider property.
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
      if (!this.authProvider.userId) {
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

      const userId =
        typeof options.userId === "function"
          ? options.userId(this, params)
          : options.userId;

      const allowed = await this.authProvider.authorize({
        resource: options.resource,
        action: options.action,
        organizationId,
        organizationName,
        domain,
        userId,
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

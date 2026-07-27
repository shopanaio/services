import type { UserError } from "./ZodSchema.js";
import type {
  ResourceName,
  Domain,
  ActionsForResource,
  Authorizable,
  BrokerAuthorizeParams,
} from "@shopana/rbac";
import {
  SAGA_DEFINITION_KEY,
  WORKFLOW_METADATA_KEY,
} from "@shopana/dbos";

// Re-export from rbac for backwards compatibility
export type {
  AuthorizeParams,
  BrokerAuthorizeParams,
  AuthProvider,
  Authorizable,
  ProtectedResourceAuthorizeParams,
} from "@shopana/rbac";

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
export type AuthorizeOptions<
  TParams = unknown,
  TSelf extends Authorizable = Authorizable,
  R extends ResourceName = ResourceName
> = {
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
  /** Subject (user ID) for authorization. */
  subject?: string | ((self: TSelf, params: TParams) => string);
};

const POLICY_METADATA_KEY = Symbol("broker:policy");

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
    target: object,
    propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<T>
  ): TypedPropertyDescriptor<T> {
    const existingPolicies =
      (Reflect.getOwnMetadata(
        POLICY_METADATA_KEY,
        target,
        propertyKey
      ) as AuthorizeOptions[]) ?? [];
    Reflect.defineMetadata(
      POLICY_METADATA_KEY,
      [...existingPolicies, options],
      target,
      propertyKey
    );

    if (isWorkflowEntrypoint(target, propertyKey)) {
      return descriptor;
    }

    const originalMethod = descriptor.value as unknown as (
      params: TParams,
      ...args: unknown[]
    ) => Promise<unknown>;

    const policyMethod = async function (
      this: TSelf,
      params: TParams,
      ...args: unknown[]
    ): Promise<unknown> {
      if (!isWorkflowEntrypoint(target, propertyKey)) {
        await authorizePolicy(this, params, options);
      }
      return originalMethod.call(this, params, ...args);
    };

    descriptor.value = policyMethod as unknown as T;

    return descriptor;
  };
}

export async function authorizePolicies<TParams>(
  target: object,
  propertyKey: string | symbol,
  params: TParams
): Promise<void> {
  const policies =
    (Reflect.getMetadata(
      POLICY_METADATA_KEY,
      target,
      propertyKey
    ) as AuthorizeOptions<TParams, Authorizable>[]) ?? [];
  let firstDenied: AuthorizationError | undefined;

  for (const policy of policies) {
    try {
      await authorizePolicy(target as Authorizable, params, policy);
    } catch (error) {
      if (!(error instanceof AuthorizationError)) {
        throw error;
      }
      firstDenied ??= error;
    }
  }

  if (firstDenied) {
    throw firstDenied;
  }
}

async function authorizePolicy<
  TParams,
  TSelf extends Authorizable
>(
  self: TSelf,
  params: TParams,
  options: AuthorizeOptions<TParams, TSelf>
): Promise<void> {
  if (!self.authProvider) {
    throw new Error(
      `@Policy requires ${self.constructor.name} to implement Authorizable`
    );
  }

  const subject =
    typeof options.subject === "function"
      ? options.subject(self, params)
      : options.subject;
  const effectiveSubject = subject ?? self.authProvider.subject;

  if (!effectiveSubject) {
    throw new AuthorizationError(
      [
        {
          code: "UNAUTHENTICATED",
          message: "Access denied: Subject is missing",
          field: null,
        },
      ],
      options.resource,
      options.action
    );
  }

  const organizationId =
    typeof options.organizationId === "function"
      ? options.organizationId(self, params)
      : options.organizationId;

  const organizationName =
    typeof options.organizationName === "function"
      ? options.organizationName(self, params)
      : options.organizationName;

  const domain =
    typeof options.domain === "function"
      ? options.domain(self, params)
      : options.domain;

  const authorizeParams: BrokerAuthorizeParams = {
    resource: options.resource,
    action: options.action,
    organizationId,
    organizationName,
    domain,
    subject,
  };
  const allowed = await self.authProvider.authorize(authorizeParams);

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
}

function isWorkflowEntrypoint(
  target: object,
  propertyKey: string | symbol
): boolean {
  if (propertyKey !== "run") {
    return false;
  }
  return Boolean(
    Reflect.getOwnMetadata(WORKFLOW_METADATA_KEY, target, propertyKey) ||
      Reflect.getOwnMetadata(SAGA_DEFINITION_KEY, target.constructor)
  );
}

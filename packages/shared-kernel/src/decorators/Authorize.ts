import type { UserError } from "./ZodSchema.js";
import {
  validateAuthorizeInput,
  type ResourceName,
  type Domain,
  type ActionsForResource,
  type Authorizable,
  type BrokerAuthorizeParams,
} from "@shopana/rbac";
import {
  DBOS,
  SAGA_DEFINITION_KEY,
  WORKFLOW_METADATA_KEY,
  type WorkflowExecutionContext,
} from "@shopana/dbos";
import type { BrokerAuthorizeResult } from "../broker/BrokerAuthorizeResult.js";
import type { BrokerAdminContext } from "../broker/WorkflowAuthorization.js";

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
  TSelf extends object = Authorizable,
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
const POLICY_WRAPPER_KEY = Symbol("broker:policy-wrapper");
const WORKFLOW_ADMISSION_ERROR = Symbol.for(
  "shopana.dbos.workflow-admission-error"
);

type PolicyDecorator = <T>(
  _target: object,
  _propertyKey: string | symbol,
  descriptor: TypedPropertyDescriptor<T>
) => TypedPropertyDescriptor<T>;

/**
 * Method decorator that checks authorization before executing.
 * Regular methods use Authorizable.authProvider. Workflow entrypoints use a
 * verified Admin Context on first start and IAM on DBOS recovery.
 *
 * @param options - Authorization options (resource, action, organizationId)
 *
 * @example
 * class AssignRoleScript extends BaseScript {
 *   @Policy<AssignRoleParams>({
 *     resource: "org.roles",
 *     action: "write",
 *     organizationId: (_, params) => params.organizationId
 *   })
 *   protected async execute(params: AssignRoleParams) { ... }
 * }
 */
export function Policy<TParams>(
  options: AuthorizeOptions<TParams>
): PolicyDecorator;
export function Policy<TParams, TSelf extends object>(
  options: AuthorizeOptions<TParams, TSelf>
): PolicyDecorator;
export function Policy<
  TParams = unknown,
  TSelf extends object = Authorizable
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
      throw new Error(
        "@Workflow/@Saga must be declared above @Policy so recovery authorization runs inside DBOS"
      );
    }

    const currentMethod = descriptor.value as
      | (Function & { [POLICY_WRAPPER_KEY]?: true })
      | undefined;
    if (currentMethod?.[POLICY_WRAPPER_KEY]) {
      return descriptor;
    }

    const originalMethod = currentMethod as unknown as (
      params: TParams,
      ...args: unknown[]
    ) => Promise<unknown>;

    const policyMethod = async function (
      this: TSelf,
      params: TParams,
      ...args: unknown[]
    ): Promise<unknown> {
      if (isWorkflowEntrypoint(target, propertyKey)) {
        if (await isWorkflowReplay()) {
          await authorizeWorkflowPolicies(
            this,
            propertyKey,
            params,
            args[0] as WorkflowExecutionContext | undefined
          );
        }
      } else {
        await authorizePolicies(this, propertyKey, params);
      }
      return originalMethod.call(this, params, ...args);
    };

    Object.defineProperty(policyMethod, POLICY_WRAPPER_KEY, { value: true });
    descriptor.value = policyMethod as unknown as T;

    return descriptor;
  };
}

export async function authorizePolicies<TParams>(
  target: object,
  propertyKey: string | symbol,
  params: TParams
): Promise<void> {
  const policies = getPolicies<TParams>(target, propertyKey);
  let firstDenied: AuthorizationError | undefined;

  for (const policy of policies) {
    try {
      await authorizePolicy(
        target as Authorizable,
        params,
        policy as AuthorizeOptions<TParams, Authorizable>
      );
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

export function hasPolicies(
  target: object,
  propertyKey: string | symbol
): boolean {
  return getPolicies(target, propertyKey).length > 0;
}

/**
 * Root preflight. The complete verified Admin Context is consumed here and is
 * never forwarded to DBOS.
 */
export async function authorizePoliciesWithAdminContext<TParams>(
  target: object,
  propertyKey: string | symbol,
  params: TParams,
  context: BrokerAdminContext
): Promise<void> {
  const policies = getPolicies<TParams>(target, propertyKey);
  let firstDenied: AuthorizationError | undefined;

  for (const policy of policies) {
    const input = resolveAuthorizeParams(target, params, policy, {
      subject: context.user.id,
      organizationId: context.organizationId ?? undefined,
      domain: defaultWorkflowDomain(policy.resource, context.store?.id),
    });
    if (
      !input.domain ||
      !validateAuthorizeInput({
        domain: input.domain,
        resource: input.resource,
        action: input.action,
      }).success ||
      !adminContextAllows(context, input)
    ) {
      firstDenied ??= deniedError(policy);
    }
  }

  if (firstDenied) throw firstDenied;
}

/**
 * Recovery check. IAM evaluates current authorization state using only the
 * minimal durable identity and the policy resolved from the workflow input.
 */
export async function authorizePoliciesWithIam<TParams>(
  target: object,
  propertyKey: string | symbol,
  params: TParams,
  context: WorkflowExecutionContext,
  broker: WorkflowPolicyBroker
): Promise<void> {
  const policies = getPolicies<TParams>(target, propertyKey);
  if (policies.length === 0) return;
  const authorization = context.authorization;
  if (!authorization || authorization.kind !== "admin") {
    throw unauthenticatedError(policies[0]);
  }

  let firstDenied: AuthorizationError | undefined;
  for (const policy of policies) {
    const input = resolveAuthorizeParams(target, params, policy, {
      subject: authorization.subject,
      organizationId: authorization.organizationId,
      domain: defaultWorkflowDomain(policy.resource, authorization.storeId),
    });
    if (!workflowScopeMatches(input, authorization)) {
      firstDenied ??= deniedError(policy);
      continue;
    }
    const result = await broker.call<
      BrokerAuthorizeResult,
      BrokerAuthorizeParams
    >("iam.authorize", input);
    if (!result.allowed) firstDenied ??= deniedError(policy);
  }

  if (firstDenied) throw firstDenied;
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

  const subject = resolveValue(options.subject, self, params);
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

  const authorizeParams: BrokerAuthorizeParams = {
    resource: options.resource,
    action: options.action,
    organizationId: resolveValue(options.organizationId, self, params),
    organizationName: resolveValue(options.organizationName, self, params),
    domain: resolveValue(options.domain, self, params),
    subject,
  };
  const allowed = await self.authProvider.authorize(authorizeParams);

  if (!allowed) {
    throw deniedError(options);
  }
}

async function authorizeWorkflowPolicies<TParams>(
  target: object,
  propertyKey: string | symbol,
  params: TParams,
  context: WorkflowExecutionContext | undefined
): Promise<void> {
  const policies = getPolicies<TParams>(target, propertyKey);
  if (policies.length === 0) return;
  if (!context) throw unauthenticatedError(policies[0]);
  const broker = (target as { broker?: WorkflowPolicyBroker }).broker;
  if (!broker) {
    throw new Error(
      `@Policy requires ${target.constructor.name} workflow to expose broker`
    );
  }
  try {
    await authorizePoliciesWithIam(target, propertyKey, params, context, broker);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      Object.defineProperty(error, WORKFLOW_ADMISSION_ERROR, { value: true });
    }
    throw error;
  }
}

function getPolicies<TParams>(
  target: object,
  propertyKey: string | symbol
): AuthorizeOptions<TParams, object>[] {
  return (
    (Reflect.getMetadata(
      POLICY_METADATA_KEY,
      target,
      propertyKey
    ) as AuthorizeOptions<TParams, object>[]) ?? []
  );
}

function resolveAuthorizeParams<TParams, TSelf extends object>(
  self: TSelf,
  params: TParams,
  options: AuthorizeOptions<TParams, TSelf>,
  defaults: {
    readonly subject?: string;
    readonly organizationId?: string;
    readonly domain?: string;
  }
): BrokerAuthorizeParams {
  const organizationId = resolveValue(options.organizationId, self, params);
  const organizationName = resolveValue(
    options.organizationName,
    self,
    params
  );
  return {
    resource: options.resource,
    action: options.action,
    organizationId:
      organizationId ??
      (organizationName === undefined
        ? defaults.organizationId
        : undefined),
    organizationName,
    domain: resolveValue(options.domain, self, params) ?? defaults.domain,
    subject: resolveValue(options.subject, self, params) ?? defaults.subject,
  };
}

function resolveValue<TSelf, TParams, TValue>(
  value: TValue | ((self: TSelf, params: TParams) => TValue) | undefined,
  self: TSelf,
  params: TParams
): TValue | undefined {
  return typeof value === "function"
    ? (value as (self: TSelf, params: TParams) => TValue)(self, params)
    : value;
}

function adminContextAllows(
  context: BrokerAdminContext,
  input: BrokerAuthorizeParams
): boolean {
  if (
    !input.subject ||
    input.subject !== context.user.id ||
    !context.organizationId ||
    input.organizationId !== context.organizationId ||
    (input.organizationName !== undefined &&
      input.organizationId === undefined) ||
    !input.domain
  ) {
    return false;
  }
  if (
    input.domain !== "org" &&
    (!context.store || input.domain !== `store:${context.store.id}`)
  ) {
    return false;
  }
  if (context.isSiteAdmin || context.isOrganizationOwner) return true;
  return context.permissions.some(
    (permission) =>
      permission.domain === input.domain &&
      permission.resource === input.resource &&
      permission.action === input.action
  );
}

function workflowScopeMatches(
  input: BrokerAuthorizeParams,
  authorization: NonNullable<WorkflowExecutionContext["authorization"]>
): boolean {
  if (
    input.subject !== authorization.subject ||
    input.organizationId !== authorization.organizationId
  ) {
    return false;
  }
  return (
    input.domain === "org" ||
    (authorization.storeId !== undefined &&
      input.domain === `store:${authorization.storeId}`)
  );
}

function defaultWorkflowDomain(
  resource: string,
  storeId?: string
): string {
  return resource.startsWith("store.") && storeId
    ? `store:${storeId}`
    : "org";
}

function unauthenticatedError(policy: PolicyIdentity): AuthorizationError {
  return new AuthorizationError(
    [
      {
        code: "UNAUTHENTICATED",
        message: "Access denied: Workflow authorization context is missing",
        field: null,
      },
    ],
    policy.resource,
    policy.action
  );
}

function deniedError(policy: PolicyIdentity): AuthorizationError {
  return new AuthorizationError(
    [
      {
        code: "FORBIDDEN",
        message: `Access denied: ${policy.resource}:${policy.action}`,
        field: null,
      },
    ],
    policy.resource,
    policy.action
  );
}

interface PolicyIdentity {
  readonly resource: string;
  readonly action: string;
}

interface WorkflowPolicyBroker {
  call<TResult = unknown, TParams = unknown>(
    action: string,
    params?: TParams
  ): Promise<TResult>;
}

async function isWorkflowReplay(): Promise<boolean> {
  const workflowId = DBOS.workflowID;
  if (!workflowId) return false;
  const status = await DBOS.getWorkflowStatus(workflowId);
  return (status?.recoveryAttempts ?? 1) > 1;
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

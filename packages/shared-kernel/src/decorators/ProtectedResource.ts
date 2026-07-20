import type {
  AuthProvider,
  ProtectedResourceAuthorizeParams,
  ProtectedResourceRef,
} from "@shopana/rbac";
import { AuthorizationError } from "./Authorize.js";

type Resolvable<TArgs extends unknown[], TValue> =
  | TValue
  | ((...args: TArgs) => TValue);

export type ProtectedResourceResolver<
  TArgs extends unknown[] = unknown[]
> = Resolvable<TArgs, ProtectedResourceRef | null | undefined>;

type ProtectedResourceDecorator = <T>(
  _target: object,
  _propertyKey: string | symbol,
  descriptor: TypedPropertyDescriptor<T>
) => TypedPropertyDescriptor<T>;

/**
 * Enforces service-linked mutability for a concrete resource.
 * Combine with @Policy when the boundary also requires user RBAC.
 */
export function ProtectedResource<
  TArgs extends unknown[],
  TSelf extends { authProvider: AuthProvider }
>(
  resolver: ProtectedResourceResolver<TArgs>
): ProtectedResourceDecorator {
  return function <T>(
    _target: object,
    _propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<T>
  ): TypedPropertyDescriptor<T> {
    const originalMethod = descriptor.value as unknown as (
      ...args: TArgs
    ) => Promise<unknown>;

    descriptor.value = async function (
      this: TSelf,
      ...args: TArgs
    ): Promise<unknown> {
      const protectedResource = resolve(resolver, args);

      if (
        !protectedResource ||
        !hasConcreteResourceIdentity(protectedResource) ||
        !hasCompleteOwnerClaim(protectedResource)
      ) {
        throw new AuthorizationError(
          [
            {
              code: "PROTECTED_RESOURCE_REQUIRED",
              message: "Access denied: a concrete protected resource with a complete owner claim is required",
              field: null,
            },
          ],
          "protected-resource",
          "write"
        );
      }

      const authorizeParams: ProtectedResourceAuthorizeParams = {
        protectedResource,
      };
      const allowed =
        await this.authProvider.authorizeProtectedResource(authorizeParams);
      if (!allowed) {
        throw new AuthorizationError(
          [
            {
              code: "FORBIDDEN",
              message: "Access denied: protected resource is not mutable",
              field: null,
            },
          ],
          "protected-resource",
          "write"
        );
      }

      return originalMethod.call(this, ...args);
    } as unknown as T;

    return descriptor;
  };
}

function resolve<TArgs extends unknown[], TValue>(
  value: Resolvable<TArgs, TValue>,
  args: TArgs
): TValue {
  return typeof value === "function"
    ? (value as (...args: TArgs) => TValue)(...args)
    : value;
}

function hasCompleteOwnerClaim(resource: ProtectedResourceRef): boolean {
  const hasOwnerType = Boolean(resource.ownerType?.trim());
  const hasOwnerId = Boolean(resource.ownerId?.trim());
  return hasOwnerType === hasOwnerId;
}

function hasConcreteResourceIdentity(resource: ProtectedResourceRef): boolean {
  return Boolean(
    resource.organizationId.trim() &&
      resource.resourceKind.trim() &&
      resource.resourceId.trim()
  );
}

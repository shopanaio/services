import type { ResourceName } from "@shopana/rbac";
import type { TypePolicyOptions } from "./types.js";

/**
 * Class decorator that sets the static `policy` property on a type resolver.
 * Used with authorization middleware to check permissions on load/loadMany.
 *
 * @template TSelf - Type of the resolver instance for typed domain function
 * @template R - Resource type (typed to valid resources from @shopana/rbac)
 *
 * @example
 * ```typescript
 * @TypePolicy<StoreResolver>({
 *   resource: "store.profile",
 *   action: "read",
 *   organizationId: (resolver) => resolver.$ctx.store?.organizationId ?? null,
 *   domain: (resolver) => `store:${resolver.$props}`,
 *   onDeny: "null",
 * })
 * class StoreResolver extends BaseResolver<string, Store | null> { }
 * ```
 */
export function TypePolicy<TSelf = unknown, R extends ResourceName = ResourceName>(
  options: TypePolicyOptions<TSelf, R>
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function (target: any): void {
    target.policy = options;
  };
}

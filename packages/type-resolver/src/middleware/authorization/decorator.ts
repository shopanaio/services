import type { TypePolicyOptions } from "./types.js";

/**
 * Class decorator that sets the static `policy` property on a type resolver.
 * Used with authorization middleware to check permissions on load/loadMany.
 *
 * @template TSelf - Type of the resolver instance for typed domain function
 *
 * @example
 * ```typescript
 * // Without generic - use cast if needed
 * @TypePolicy({
 *   resource: "store",
 *   action: "read",
 *   onDeny: "null",
 *   domain: (resolver) => `store:${(resolver as StoreResolver).value}`
 * })
 * class StoreResolver extends BaseResolver<string, Store | null> { }
 *
 * // With generic - full type safety
 * @TypePolicy<StoreResolver>({
 *   resource: "store",
 *   action: "read",
 *   onDeny: "null",
 *   domain: (resolver) => `store:${resolver.value}`
 * })
 * class StoreResolver extends BaseResolver<string, Store | null> { }
 * ```
 */
export function TypePolicy<TSelf = unknown>(options: TypePolicyOptions<TSelf>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function (target: any): void {
    target.policy = options;
  };
}

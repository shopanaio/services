import type { TypePolicy as TypePolicyOptions } from "../baseType.js";

/**
 * Class decorator that sets the static `policy` property on a type resolver.
 *
 * @example
 * ```typescript
 * @TypePolicy({ resource: "store", action: "read", onDeny: "null" })
 * class StoreResolver extends BaseResolver<string, Store | null> {
 *   // ...
 * }
 * ```
 */
export function TypePolicy(options: TypePolicyOptions) {
  return function <T extends new (...args: any[]) => any>(target: T): T {
    (target as any).policy = options;
    return target;
  };
}

import { createHash } from "node:crypto";
import type { BaseScript } from "../BaseScript.js";

export interface CachedOptions<TParams = unknown> {
  /** Cache key prefix */
  prefix: string;
  /** TTL in milliseconds */
  ttl?: number;
  /** Function to extract cache key from params */
  keyFrom: (params: TParams) => string;
}

const DEFAULT_TTL = 60 * 1000; // 1 minute

/**
 * Method decorator that caches the result of execute method.
 * Uses SHA256 hash of the key for Redis compatibility.
 */
export function Cached<TParams>(options: CachedOptions<TParams>) {
  return function <TResult>(
    _target: unknown,
    _propertyKey: string,
    descriptor: TypedPropertyDescriptor<(params: TParams) => Promise<TResult>>
  ) {
    const originalMethod = descriptor.value!;

    descriptor.value = async function (
      this: BaseScript<TParams, TResult>,
      params: TParams
    ): Promise<TResult> {
      const keyValue = options.keyFrom(params);
      const hash = createHash("sha256").update(keyValue).digest("hex");
      const cacheKey = `${options.prefix}:${hash}`;

      const cached = await this.services.cache.get<TResult>(cacheKey);
      if (cached) {
        return cached;
      }

      const result = await originalMethod.call(this, params);

      await this.services.cache.set(cacheKey, result, options.ttl ?? DEFAULT_TTL);

      return result;
    };

    return descriptor;
  };
}

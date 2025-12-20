import type { Cache } from "cache-manager";

export interface CachedResolverOptions<TResolver = unknown> {
  /** Cache name (used as key prefix) */
  cacheName: string;
  /** Function to compute cache key from resolver instance */
  key: (resolver: TResolver) => string;
  /** TTL in milliseconds */
  ttl?: number;
}

interface ResolverContext {
  ctx: {
    kernel: {
      cache: Cache;
    };
  };
}

const DEFAULT_TTL = 60 * 1000; // 1 minute

/**
 * Method decorator that caches the result of resolver methods.
 * Similar to Spring @Cacheable annotation.
 */
export function CachedResolver<TResolver>(
  options: CachedResolverOptions<TResolver>
) {
  return function <TResult>(
    _target: unknown,
    _propertyKey: string,
    descriptor: TypedPropertyDescriptor<() => Promise<TResult>>
  ) {
    const originalMethod = descriptor.value!;

    descriptor.value = async function (
      this: ResolverContext & TResolver
    ): Promise<TResult> {
      const cache = this.ctx.kernel.cache;
      const cacheKey = `${options.cacheName}:${options.key(this)}`;

      const cached = await cache.get<TResult>(cacheKey);
      if (cached) {
        return cached;
      }

      const result = await originalMethod.call(this);

      if (result !== null && result !== undefined) {
        await cache.set(cacheKey, result, options.ttl ?? DEFAULT_TTL);
      }

      return result;
    };

    return descriptor;
  };
}

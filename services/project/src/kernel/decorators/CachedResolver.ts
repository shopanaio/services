import type { Cache } from "cache-manager";

export interface CachedResolverOptions<TContext = unknown> {
  /** Cache key prefix */
  prefix: string;
  /** TTL in milliseconds */
  ttl?: number;
  /** Function to extract cache key from resolver context */
  keyFrom: (ctx: TContext) => string;
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
 * Uses keyFrom function to extract cache key directly without hashing.
 */
export function CachedResolver<TContext>(
  options: CachedResolverOptions<TContext>
) {
  return function <TResult>(
    _target: unknown,
    _propertyKey: string,
    descriptor: TypedPropertyDescriptor<() => Promise<TResult>>
  ) {
    const originalMethod = descriptor.value!;

    descriptor.value = async function (
      this: ResolverContext & TContext
    ): Promise<TResult> {
      const cache = this.ctx.kernel.cache;
      const cacheKey = `${options.prefix}:${options.keyFrom(this)}`;

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

export interface CacheStore {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
}

export interface CacheOptions<TResolver = unknown> {
  /** Cache name (used as key prefix) */
  cacheName: string;
  /** Function to compute cache key from resolver instance */
  key: (resolver: TResolver) => string;
  /** TTL in milliseconds */
  ttl?: number;
}

interface HasGetCache {
  getCache(): CacheStore;
}

const DEFAULT_TTL = 60 * 1000; // 1 minute

/**
 * Method decorator that caches the result of resolver methods.
 * Similar to Spring @Cacheable annotation.
 * Requires getCache() method to be implemented in the class.
 */
export function Cache<TResolver>(options: CacheOptions<TResolver>) {
  return function <TResult>(
    _target: unknown,
    _propertyKey: string,
    descriptor: TypedPropertyDescriptor<() => Promise<TResult>>
  ) {
    const originalMethod = descriptor.value!;

    descriptor.value = async function (
      this: TResolver & HasGetCache
    ): Promise<TResult> {
      const cache = this.getCache();
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

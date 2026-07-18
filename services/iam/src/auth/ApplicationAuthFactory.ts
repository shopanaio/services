import {
  createApplicationAuth,
  type ApplicationAuth,
  type ApplicationAuthConfiguration,
} from "./auth.js";

interface CacheEntry {
  auth: ApplicationAuth;
  version: string;
}

/**
 * Creates and caches Better Auth instances with application-specific methods,
 * cookies, JWT audience, and session scope.
 */
export class ApplicationAuthFactory {
  private readonly cache = new Map<string, CacheEntry>();

  constructor(private readonly maxEntries = 100) {}

  forApplication(config: ApplicationAuthConfiguration): ApplicationAuth {
    const version = String(config.version);
    const cached = this.cache.get(config.applicationId);

    if (cached?.version === version) {
      // Refresh insertion order so the map acts as a small LRU cache.
      this.cache.delete(config.applicationId);
      this.cache.set(config.applicationId, cached);
      return cached.auth;
    }

    const auth = createApplicationAuth(config);
    this.cache.set(config.applicationId, { auth, version });
    this.evictOverflow();
    return auth;
  }

  invalidate(applicationId: string): void {
    this.cache.delete(applicationId);
  }

  clear(): void {
    this.cache.clear();
  }

  private evictOverflow(): void {
    while (this.cache.size > this.maxEntries) {
      const oldestApplicationId = this.cache.keys().next().value;
      if (!oldestApplicationId) return;
      this.cache.delete(oldestApplicationId);
    }
  }
}

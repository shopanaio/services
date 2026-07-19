import {
  createApplicationAuth,
  type ApplicationAuth,
  type ApplicationAuthConfiguration,
} from "./auth.js";
import type { ApplicationAuthKeyring } from "../services/ApplicationAuthKeyring.js";
import type { ApplicationAuthSecretService } from "../services/ApplicationAuthSecretService.js";

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

  constructor(
    private readonly keyring: ApplicationAuthKeyring,
    private readonly secrets: ApplicationAuthSecretService,
    private readonly maxEntries = 100
  ) {}

  forApplication(config: ApplicationAuthConfiguration): ApplicationAuth {
    const version = `${String(config.version)}:${config.secretKeyVersion}`;
    const cached = this.cache.get(config.applicationId);

    if (cached?.version === version) {
      // Refresh insertion order so the map acts as a small LRU cache.
      this.cache.delete(config.applicationId);
      this.cache.set(config.applicationId, cached);
      return cached.auth;
    }

    this.keyring.assertVersionsAvailable([config.secretKeyVersion]);
    const auth = createApplicationAuth(config, {
      keyring: this.keyring,
      secrets: this.secrets,
    });
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

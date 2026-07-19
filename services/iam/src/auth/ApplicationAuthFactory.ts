import type {
  ApplicationAuthConfigurationRecord,
  ApplicationAuthDeliveryProfile,
  ApplicationAuthProviderName,
} from "../repositories/models/application-auth.js";
import type { ApplicationAuthProviderCredentials } from "../repositories/ApplicationAuthConfigurationRepository.js";
import type { ApplicationAuthKeyring } from "../services/ApplicationAuthKeyring.js";
import type { ApplicationAuthEmailDeliveryPort } from "../services/ApplicationAuthEmailDeliveryPort.js";
import type { ApplicationAuthSecretService } from "../services/ApplicationAuthSecretService.js";
import {
  applicationAuthDeliveryProfileSchema,
  applicationAuthMutableConfigurationSchema,
  applicationAuthProviderCredentialsSchema,
  calculateEffectiveApplicationAuthPolicy,
  normalizeApplicationAuthOrigin,
} from "./applicationAuthConfiguration.js";
import {
  createApplicationAuth,
  type ApplicationAuth,
  type ApplicationAuthRuntimeConfiguration,
} from "./auth.js";
import {
  createEffectiveApplicationAuthRouteManifest,
  type EffectiveApplicationAuthRouteManifest,
} from "./applicationAuthRouteManifest.js";
import { assertApplicationId } from "./AuthScope.js";

export interface ApplicationAuthConfigurationSource {
  findActive(
    applicationId: string
  ): Promise<ApplicationAuthConfigurationRecord | null>;
  listOrigins(applicationId: string): Promise<Array<{ origin: string }>>;
  readProviderCredentials(
    applicationId: string,
    provider: ApplicationAuthProviderName
  ): Promise<ApplicationAuthProviderCredentials | null>;
  findDeliveryProfile(
    applicationId: string
  ): Promise<ApplicationAuthDeliveryProfile | null>;
}

export interface ApplicationAuthInvalidationEvent {
  applicationId: string;
  revision: number;
  changeType: string;
}

export interface ApplicationAuthFactoryRuntime {
  auth: ApplicationAuth;
  applicationId: string;
  configurationRevision: number;
  resource: string;
  trustedOrigins: readonly string[];
  routeManifest: EffectiveApplicationAuthRouteManifest;
}

export interface ApplicationAuthFactoryOptions {
  emailDelivery?: ApplicationAuthEmailDeliveryPort;
  publicBaseUrl?: string | (() => string | undefined);
  revisionCheckIntervalMs?: number;
  hardTtlMs?: number;
  maxEntries?: number;
  now?: () => number;
}

export interface ApplicationAuthFactoryRequestOptions {
  /** Bypass the local revision window for refresh/provider callback routes. */
  forceRevisionCheck?: boolean;
}

interface CacheEntry {
  runtime: ApplicationAuthFactoryRuntime;
  configuration: Readonly<ApplicationAuthRuntimeConfiguration>;
  version: string;
  hardExpiresAt: number;
  nextRevisionCheckAt: number;
}

const DEFAULT_REVISION_CHECK_INTERVAL_MS = 30_000;
const DEFAULT_HARD_TTL_MS = 5 * 60_000;

/**
 * Loads, validates and caches application-specific Better Auth compositions.
 *
 * Cache entries are never used after a failed revision check. A missing
 * realm, provider secret, key version or delivery dependency therefore fails
 * the request instead of falling back to a stale/default provider instance.
 */
export class ApplicationAuthFactory {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly applicationGenerations = new Map<string, number>();
  private readonly pending = new Map<
    string,
    Promise<ApplicationAuthFactoryRuntime>
  >();
  private readonly revisionCheckIntervalMs: number;
  private readonly hardTtlMs: number;
  private readonly maxEntries: number;
  private readonly now: () => number;
  private generation = 0;

  constructor(
    private readonly keyring: ApplicationAuthKeyring,
    private readonly secrets: ApplicationAuthSecretService,
    private readonly configurations: ApplicationAuthConfigurationSource,
    private readonly options: ApplicationAuthFactoryOptions = {}
  ) {
    this.revisionCheckIntervalMs =
      options.revisionCheckIntervalMs ?? DEFAULT_REVISION_CHECK_INTERVAL_MS;
    this.hardTtlMs = options.hardTtlMs ?? DEFAULT_HARD_TTL_MS;
    this.maxEntries = options.maxEntries ?? 100;
    this.now = options.now ?? Date.now;
    if (
      this.revisionCheckIntervalMs < 1 ||
      this.revisionCheckIntervalMs > DEFAULT_REVISION_CHECK_INTERVAL_MS
    ) {
      throw new Error(
        "Application auth revision check interval must be between 1ms and 30s"
      );
    }
    if (this.hardTtlMs < 1 || this.hardTtlMs > DEFAULT_HARD_TTL_MS) {
      throw new Error(
        "Application auth factory hard TTL must be between 1ms and 5 minutes"
      );
    }
    if (!Number.isSafeInteger(this.maxEntries) || this.maxEntries < 1) {
      throw new Error("Application auth factory cache size is invalid");
    }
  }

  async forApplication(
    applicationId: string,
    requestOptions: ApplicationAuthFactoryRequestOptions = {}
  ): Promise<ApplicationAuthFactoryRuntime> {
    assertApplicationId(applicationId);
    const now = this.now();
    const cached = this.cache.get(applicationId);
    if (
      cached &&
      !requestOptions.forceRevisionCheck &&
      now < cached.hardExpiresAt &&
      now < cached.nextRevisionCheckAt
    ) {
      this.touch(applicationId, cached);
      return cached.runtime;
    }

    const pending = this.pending.get(applicationId);
    if (pending) return pending;

    const generation = this.currentGeneration(applicationId);
    const build = this.loadAndBuild(
      applicationId,
      cached,
      generation
    );
    const rebuild = build.finally(() => {
      if (this.pending.get(applicationId) === rebuild) {
        this.pending.delete(applicationId);
      }
    });
    this.pending.set(applicationId, rebuild);
    return rebuild;
  }

  invalidate(applicationId: string): void;
  invalidate(event: ApplicationAuthInvalidationEvent): void;
  invalidate(input: string | ApplicationAuthInvalidationEvent): void {
    const applicationId =
      typeof input === "string" ? input : input.applicationId;
    assertApplicationId(applicationId);
    const cached = this.cache.get(applicationId);
    if (
      cached &&
      typeof input !== "string" &&
      input.revision <= cached.configuration.revision
    ) {
      return;
    }
    this.applicationGenerations.set(
      applicationId,
      (this.applicationGenerations.get(applicationId) ?? 0) + 1
    );
    this.cache.delete(applicationId);
    this.pending.delete(applicationId);
  }

  clear(): void {
    this.generation += 1;
    this.cache.clear();
    this.pending.clear();
    this.applicationGenerations.clear();
  }

  private async loadAndBuild(
    applicationId: string,
    cached: CacheEntry | undefined,
    generation: string
  ): Promise<ApplicationAuthFactoryRuntime> {
    const configuration = await this.loadRuntimeConfiguration(applicationId);
    this.assertGeneration(applicationId, generation);
    const version = `${configuration.revision}:${configuration.secretKeyVersion}`;
    const now = this.now();

    if (
      cached &&
      cached.version === version &&
      cached.configuration.publicBaseUrl === configuration.publicBaseUrl &&
      now < cached.hardExpiresAt
    ) {
      cached.nextRevisionCheckAt = now + this.revisionCheckIntervalMs;
      this.assertGeneration(applicationId, generation);
      this.touch(applicationId, cached);
      return cached.runtime;
    }

    this.keyring.assertVersionsAvailable([configuration.secretKeyVersion]);
    const auth = createApplicationAuth(configuration, {
      keyring: this.keyring,
      secrets: this.secrets,
      emailDelivery: this.options.emailDelivery,
    });
    const enabledSocialProviders = (
      ["google", "facebook"] as const
    ).filter((provider) => configuration.providers[provider] !== undefined);
    const routeManifest = createEffectiveApplicationAuthRouteManifest({
      policy: configuration.policy,
      emailVerificationEnabled:
        (configuration.policy.passwordSignInAllowed ||
          configuration.policy.passwordSignUpAllowed) &&
        configuration.emailVerificationRequired,
      enabledSocialProviders,
    });
    const runtime: ApplicationAuthFactoryRuntime = Object.freeze({
      auth,
      applicationId,
      configurationRevision: configuration.revision,
      resource: configuration.resource,
      trustedOrigins: Object.freeze([...configuration.trustedOrigins]),
      routeManifest,
    });
    const entry: CacheEntry = {
      runtime,
      configuration: Object.freeze(configuration),
      version,
      hardExpiresAt: now + this.hardTtlMs,
      nextRevisionCheckAt: now + this.revisionCheckIntervalMs,
    };
    this.assertGeneration(applicationId, generation);
    this.cache.set(applicationId, entry);
    this.evictOverflow();
    return runtime;
  }

  private async loadRuntimeConfiguration(
    applicationId: string
  ): Promise<ApplicationAuthRuntimeConfiguration> {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const initial = await this.configurations.findActive(applicationId);
      if (!initial) {
        throw new Error("Application auth realm is not active");
      }
      applicationAuthMutableConfigurationSchema.parse({
        registrationMode: initial.registrationMode,
        passwordSignUpEnabled: initial.passwordSignUpEnabled,
        passwordSignInEnabled: initial.passwordSignInEnabled,
        passwordResetEnabled: initial.passwordResetEnabled,
        emailVerificationRequired: initial.emailVerificationRequired,
        emailOtpSignInEnabled: initial.emailOtpSignInEnabled,
        emailOtpSignUpEnabled: initial.emailOtpSignUpEnabled,
        googleEnabled: initial.googleEnabled,
        facebookEnabled: initial.facebookEnabled,
        consentMode: initial.consentMode,
        accessTokenTtlSeconds: initial.accessTokenTtlSeconds,
        idTokenTtlSeconds: initial.idTokenTtlSeconds,
        refreshTokenTtlSeconds: initial.refreshTokenTtlSeconds,
        sessionTtlSeconds: initial.sessionTtlSeconds,
        brandingJson: initial.brandingJson,
        defaultLocale: initial.defaultLocale,
      });
      const policy = calculateEffectiveApplicationAuthPolicy(initial);
      const providerNames = (["google", "facebook"] as const).filter(
        (provider) => policy.socialSignInAllowed[provider]
      );
      const [origins, deliveryProfile, providerEntries] = await Promise.all([
        this.configurations.listOrigins(applicationId),
        this.configurations.findDeliveryProfile(applicationId),
        Promise.all(
          providerNames.map(async (provider) => {
            const credentials =
              await this.configurations.readProviderCredentials(
                applicationId,
                provider
              );
            if (!credentials?.enabled) {
              throw new Error(
                `Enabled ${provider} provider configuration is unavailable`
              );
            }
            applicationAuthProviderCredentialsSchema.parse({
              provider,
              enabled: credentials.enabled,
              clientId: credentials.clientId,
              clientSecret: credentials.clientSecret,
              scopes: credentials.scopes,
              updatedBy: credentials.updatedBy,
            });
            return [provider, credentials] as const;
          })
        ),
      ]);
      const trustedOrigins = origins.map(({ origin }) => {
        const normalized = normalizeApplicationAuthOrigin(origin, {
          allowInsecureLocalhost: process.env.NODE_ENV !== "production",
        });
        if (normalized !== origin) {
          throw new Error("Application auth origin is not canonical");
        }
        return origin;
      });
      if (deliveryProfile) {
        applicationAuthDeliveryProfileSchema.parse({
          transportProfile: deliveryProfile.transportProfile,
          senderIdentity: deliveryProfile.senderIdentity,
          emailVerificationTemplateId:
            deliveryProfile.emailVerificationTemplateId,
          passwordResetTemplateId: deliveryProfile.passwordResetTemplateId,
          emailOtpSignInTemplateId: deliveryProfile.emailOtpSignInTemplateId,
          updatedBy: deliveryProfile.updatedBy,
        });
      }
      const final = await this.configurations.findActive(applicationId);
      if (
        !final ||
        final.revision !== initial.revision ||
        final.secretKeyVersion !== initial.secretKeyVersion
      ) {
        if (attempt === 0) continue;
        throw new Error(
          "Application auth configuration changed while factory was loading"
        );
      }

      const providers = Object.fromEntries(
        providerEntries.map(([provider, credentials]) => [
          provider,
          {
            provider,
            clientId: credentials.clientId,
            clientSecret: credentials.clientSecret,
            scopes: credentials.scopes,
          },
        ])
      ) as ApplicationAuthRuntimeConfiguration["providers"];

      return {
        applicationId,
        revision: initial.revision,
        secretKeyVersion: initial.secretKeyVersion,
        publicBaseUrl: this.resolvePublicBaseUrl(),
        resource: initial.resource,
        trustedOrigins,
        policy,
        emailVerificationRequired: initial.emailVerificationRequired,
        accessTokenTtlSeconds: initial.accessTokenTtlSeconds,
        idTokenTtlSeconds: initial.idTokenTtlSeconds,
        refreshTokenTtlSeconds: initial.refreshTokenTtlSeconds,
        sessionTtlSeconds: initial.sessionTtlSeconds,
        providers,
        deliveryProfile,
      };
    }
    throw new Error("Application auth configuration could not be loaded");
  }

  private resolvePublicBaseUrl(): string {
    const configured =
      typeof this.options.publicBaseUrl === "function"
        ? this.options.publicBaseUrl()
        : this.options.publicBaseUrl ?? process.env.IAM_PUBLIC_BASE_URL;
    if (!configured) {
      throw new Error("IAM_PUBLIC_BASE_URL is required for application auth");
    }
    const url = new URL(configured);
    if (
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      (url.pathname !== "" && url.pathname !== "/")
    ) {
      throw new Error("IAM_PUBLIC_BASE_URL must be an origin without a path");
    }
    return url.origin;
  }

  private touch(applicationId: string, entry: CacheEntry): void {
    this.cache.delete(applicationId);
    this.cache.set(applicationId, entry);
  }

  private currentGeneration(applicationId: string): string {
    return `${this.generation}:${
      this.applicationGenerations.get(applicationId) ?? 0
    }`;
  }

  private assertGeneration(applicationId: string, expected: string): void {
    if (this.currentGeneration(applicationId) !== expected) {
      throw new Error(
        "Application auth factory build was invalidated before completion"
      );
    }
  }

  private evictOverflow(): void {
    while (this.cache.size > this.maxEntries) {
      const oldestApplicationId = this.cache.keys().next().value;
      if (!oldestApplicationId) return;
      this.cache.delete(oldestApplicationId);
    }
  }
}

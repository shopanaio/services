import type {
  ApplicationAuthConfigurationRecord,
  ApplicationAuthDeliveryProfile,
} from "../repositories/models/application-auth.js";
import type { ApplicationAuthConfiguredProvider } from "../repositories/ApplicationAuthConfigurationRepository.js";
import type { ApplicationAuthKeyring } from "../services/ApplicationAuthKeyring.js";
import type { ApplicationAuthEmailDeliveryPort } from "../services/ApplicationAuthEmailDeliveryPort.js";
import type { ApplicationAuthSecretService } from "../services/ApplicationAuthSecretService.js";
import type { ApplicationAuthLiveStateInvalidationBus } from "../events/application-auth/index.js";
import {
  type ApplicationAuthMutableConfiguration,
  type ApplicationAuthUiLocale,
  applicationAuthDeliveryProfileSchema,
  applicationAuthMutableConfigurationSchema,
  applicationAuthProviderCredentialsSchema,
  applicationAuthProviderScopesSchema,
  calculateEffectiveApplicationAuthPolicy,
  normalizeApplicationAuthOrigin,
} from "./applicationAuthConfiguration.js";
import {
  assertApplicationSocialProviderScopes,
  parseApplicationAuthProviderName,
} from "./applicationSocialProviders.js";
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
  ): Promise<
    (ApplicationAuthConfigurationRecord & { organizationId: string }) | null
  >;
  listOrigins(applicationId: string): Promise<Array<{ origin: string }>>;
  listConfiguredProviders(
    applicationId: string
  ): Promise<ApplicationAuthConfiguredProvider[]>;
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
  organizationId: string;
  configurationRevision: number;
  secretKeyVersion: number;
  resource: string;
  issuer: string;
  policy: Readonly<ApplicationAuthRuntimeConfiguration["policy"]>;
  branding: Readonly<ApplicationAuthMutableConfiguration["brandingJson"]>;
  defaultLocale: ApplicationAuthUiLocale;
  emailVerificationRequired: boolean;
  trustedOrigins: readonly string[];
  routeManifest: EffectiveApplicationAuthRouteManifest;
}

export interface ApplicationAuthFactoryOptions {
  emailDelivery?: ApplicationAuthEmailDeliveryPort;
  liveStateInvalidation?: ApplicationAuthLiveStateInvalidationBus;
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
      liveStateInvalidation: this.options.liveStateInvalidation,
    });
    const enabledSocialProviders = configuration.providers.map(
      ({ provider }) => provider
    );
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
      organizationId: configuration.organizationId,
      configurationRevision: configuration.revision,
      secretKeyVersion: configuration.secretKeyVersion,
      resource: configuration.resource,
      issuer: `${configuration.publicBaseUrl}/auth/applications/${applicationId}`,
      policy: Object.freeze({
        ...configuration.policy,
        socialProviders: Object.freeze(
          configuration.policy.socialProviders.map((provider) =>
            Object.freeze({ ...provider })
          )
        ),
      }),
      branding: Object.freeze({ ...configuration.branding }),
      defaultLocale: configuration.defaultLocale,
      emailVerificationRequired: configuration.emailVerificationRequired,
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
      const mutableConfiguration = applicationAuthMutableConfigurationSchema.parse({
        registrationMode: initial.registrationMode,
        passwordSignUpEnabled: initial.passwordSignUpEnabled,
        passwordSignInEnabled: initial.passwordSignInEnabled,
        passwordResetEnabled: initial.passwordResetEnabled,
        emailVerificationRequired: initial.emailVerificationRequired,
        emailOtpSignInEnabled: initial.emailOtpSignInEnabled,
        emailOtpSignUpEnabled: initial.emailOtpSignUpEnabled,
        consentMode: initial.consentMode,
        accessTokenTtlSeconds: initial.accessTokenTtlSeconds,
        idTokenTtlSeconds: initial.idTokenTtlSeconds,
        refreshTokenTtlSeconds: initial.refreshTokenTtlSeconds,
        sessionTtlSeconds: initial.sessionTtlSeconds,
        brandingJson: initial.brandingJson,
        defaultLocale: initial.defaultLocale,
      });
      const [origins, deliveryProfile, configuredProviders] = await Promise.all([
        this.configurations.listOrigins(applicationId),
        this.configurations.findDeliveryProfile(applicationId),
        this.configurations.listConfiguredProviders(applicationId),
      ]);
      this.keyring.assertVersionsAvailable(
        configuredProviders.map(({ secretKeyVersion }) => secretKeyVersion)
      );
      const providerEntries = configuredProviders.map((configuration) => {
        if (configuration.applicationId !== applicationId) {
          throw new Error("Application auth provider scope mismatch");
        }
        const provider = parseApplicationAuthProviderName(
          configuration.provider
        );
        const scopes = applicationAuthProviderScopesSchema.parse(
          configuration.scopes
        );
        if (new Set(scopes).size !== scopes.length) {
          throw new Error("Application auth provider scopes are duplicated");
        }
        assertApplicationSocialProviderScopes(provider, scopes);
        if (!configuration.enabled) {
          return Object.freeze({
            provider,
            enabled: false as const,
            scopes: Object.freeze([...scopes]),
          });
        }
        const validated = applicationAuthProviderCredentialsSchema.parse({
          provider,
          enabled: true,
          clientId: configuration.clientId,
          clientSecret: configuration.clientSecret,
          scopes,
          updatedBy: configuration.updatedBy,
        });
        return Object.freeze({
          provider,
          enabled: true as const,
          clientId: validated.clientId,
          clientSecret: validated.clientSecret,
          scopes: Object.freeze([...validated.scopes]),
        });
      });
      const policy = calculateEffectiveApplicationAuthPolicy(
        initial,
        providerEntries
      );
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

      const providers = Object.freeze(
        providerEntries.flatMap((provider) => {
          if (!provider.enabled) return [];
          const providerPolicy = policy.socialProviders.find(
            (candidate) => candidate.provider === provider.provider
          );
          if (!providerPolicy?.signInAllowed) return [];
          return [
            Object.freeze({
              provider: provider.provider,
              clientId: provider.clientId,
              clientSecret: provider.clientSecret,
              scopes: provider.scopes,
              disableSignUp: !providerPolicy.signUpAllowed,
            }),
          ];
        })
      );

      return {
        applicationId,
        organizationId: initial.organizationId,
        revision: initial.revision,
        secretKeyVersion: initial.secretKeyVersion,
        publicBaseUrl: this.resolvePublicBaseUrl(),
        resource: initial.resource,
        trustedOrigins,
        policy,
        branding: { ...mutableConfiguration.brandingJson },
        defaultLocale: mutableConfiguration.defaultLocale,
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

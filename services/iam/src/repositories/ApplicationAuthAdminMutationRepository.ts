import type { TransactionManager } from "@shopana/shared-kernel";
import { ReadOnly, Transactional } from "@shopana/shared-kernel";
import { and, eq, isNull, ne, sql } from "drizzle-orm";
import type { Database } from "../infrastructure/db/database.js";
import {
  DEFAULT_APPLICATION_AUTH_CONFIGURATION,
  applicationAuthDeliveryProfileSchema,
  applicationAuthMutableConfigurationSchema,
  applicationAuthProviderCredentialsSchema,
  applicationAuthProviderScopesSchema,
  createApplicationResource,
  type ApplicationAuthDeliveryProfileInput,
  type ApplicationAuthMutableConfiguration,
} from "../auth/applicationAuthConfiguration.js";
import {
  assertApplicationSocialProviderScopes,
  parseApplicationAuthProviderName,
  type ApplicationAuthProviderName,
} from "../auth/applicationSocialProviders.js";
import { ApplicationAuthKeyring } from "../services/ApplicationAuthKeyring.js";
import { BaseRepository } from "./BaseRepository.js";
import {
  application,
  applicationAuthConfiguration,
  applicationAuthDeliveryProfile,
  applicationAuthOrigin,
  applicationAuthProvider,
  organization,
  resourceManagement,
  type Application,
  type ApplicationAuthConfigurationRecord,
  type ResourceManagementMode,
  applicationOauthClient,
} from "./models/index.js";
import {
  APPLICATION_OAUTH_GRANT_TYPES,
  APPLICATION_OAUTH_PROTOCOL_POLICY_VERSION,
  APPLICATION_OAUTH_RESPONSE_TYPES,
  APPLICATION_OAUTH_SCOPES,
  createApplicationOAuthClientPolicyMetadata,
} from "../auth/applicationOAuthPolicy.js";

export interface ApplicationAuthAdminMutationScope {
  organizationId: string;
  applicationId: string;
  archived: boolean;
  configuration: ApplicationAuthConfigurationRecord;
  deliveryConfigured: boolean;
}

export interface CreateAdminApplicationInput {
  /** IAM-generated identifier; never accepted from GraphQL input. */
  applicationId: string;
  organizationId: string;
  name: string;
  displayName: string;
  description?: string | null;
  managementMode: ResourceManagementMode;
  applicationAuth?: {
    origin: string;
    redirectUri: string;
    postLogoutRedirectUri: string;
    defaultLocale: "en" | "uk" | "ru";
    clientId: string;
    actorId: string;
  };
}

export interface UpdateAdminApplicationInput {
  organizationId: string;
  applicationId: string;
  expectedRevision: number;
  patch: {
    name?: string;
    displayName?: string;
    description?: string | null;
  };
}

export interface UpdateAdminApplicationAuthInput {
  applicationId: string;
  expectedRevision: number;
  patch: Partial<ApplicationAuthMutableConfiguration>;
  trustedOrigins?: readonly string[];
  emailDelivery?: ApplicationAuthDeliveryProfileInput;
}

export interface ConfigureAdminApplicationProviderInput {
  applicationId: string;
  provider: ApplicationAuthProviderName;
  clientId: string;
  clientSecret: string;
  scopes: readonly string[];
  expectedRevision: number;
  actorId: string;
}

export interface UpdateAdminApplicationProviderInput {
  applicationId: string;
  provider: ApplicationAuthProviderName;
  enabled?: boolean;
  scopes?: readonly string[];
  expectedRevision: number;
  actorId: string;
}

export interface RotateAdminApplicationProviderCredentialsInput {
  applicationId: string;
  provider: ApplicationAuthProviderName;
  clientId: string;
  clientSecret: string;
  expectedRevision: number;
  actorId: string;
}

export interface AdminApplicationProviderRecord {
  applicationId: string;
  provider: ApplicationAuthProviderName;
  enabled: boolean;
  scopes: readonly string[];
  revision: number;
  updatedAt: Date;
  updatedBy: string;
}

/**
 * Transaction-aware write repository for the Admin GraphQL application realm.
 *
 * Every existing-realm mutation claims the shared configuration revision before
 * changing dependent rows. A failed claim therefore cannot partially update
 * application metadata, origins, delivery settings, or provider credentials.
 */
export class ApplicationAuthAdminMutationRepository extends BaseRepository {
  constructor(
    db: Database,
    txManager: TransactionManager<Database>,
    private readonly keyring: ApplicationAuthKeyring
  ) {
    super(db, txManager);
  }

  @ReadOnly()
  async findScope(
    organizationId: string,
    applicationId: string,
    options: { includeArchived?: boolean } = {}
  ): Promise<ApplicationAuthAdminMutationScope | null> {
    const conditions = [
      eq(application.organizationId, organizationId),
      eq(application.id, applicationId),
      isNull(organization.deletedAt),
    ];
    if (!options.includeArchived) conditions.push(isNull(application.deletedAt));
    const [record] = await this.connection
      .select({
        organizationId: application.organizationId,
        applicationId: application.id,
        archivedAt: application.deletedAt,
        configuration: applicationAuthConfiguration,
      })
      .from(application)
      .innerJoin(organization, eq(organization.id, application.organizationId))
      .innerJoin(
        applicationAuthConfiguration,
        eq(applicationAuthConfiguration.applicationId, application.id)
      )
      .where(and(...conditions))
      .limit(1);
    if (!record) return null;
    const [delivery] = await this.connection
      .select({ applicationId: applicationAuthDeliveryProfile.applicationId })
      .from(applicationAuthDeliveryProfile)
      .where(
        eq(applicationAuthDeliveryProfile.applicationId, record.applicationId)
      )
      .limit(1);
    return {
      organizationId: record.organizationId,
      applicationId: record.applicationId,
      archived: record.archivedAt !== null,
      configuration: record.configuration,
      deliveryConfigured: Boolean(delivery),
    };
  }

  @Transactional()
  async createApplication(
    input: CreateAdminApplicationInput
  ): Promise<{ application: Application; configuration: ApplicationAuthConfigurationRecord }> {
    const [activeOrganization] = await this.connection
      .select({ id: organization.id })
      .from(organization)
      .where(
        and(
          eq(organization.id, input.organizationId),
          isNull(organization.deletedAt)
        )
      )
      .limit(1);
    if (!activeOrganization) {
      throw new Error("Active organization does not exist");
    }
    const [createdApplication] = await this.connection
      .insert(application)
      .values({
        id: input.applicationId,
        organizationId: input.organizationId,
        name: input.name,
        displayName: input.displayName,
        description: input.description ?? null,
      })
      .returning();
    if (!createdApplication) throw new Error("Application could not be created");

    const [createdManagement] = await this.connection
      .insert(resourceManagement)
      .values({
        id: await this.generateUuidV7(),
        organizationId: input.organizationId,
        resourceKind: "application",
        resourceId: input.applicationId,
        managementMode: input.managementMode,
      })
      .returning({ id: resourceManagement.id });
    if (!createdManagement) {
      throw new Error("Application resource management could not be created");
    }

    const configuration = applicationAuthMutableConfigurationSchema.parse({
      ...DEFAULT_APPLICATION_AUTH_CONFIGURATION,
      ...(input.applicationAuth
        ? {
            registrationMode: "open",
            emailVerificationRequired: false,
            brandingJson: {
              displayName: truncateUtf16(input.displayName, 80),
            },
            defaultLocale: input.applicationAuth.defaultLocale,
          }
        : {}),
    });
    const [createdConfiguration] = await this.connection
      .insert(applicationAuthConfiguration)
      .values({
        applicationId: input.applicationId,
        resource: createApplicationResource(input.applicationId),
        secretKeyVersion: this.keyring.activeVersion,
        realmEnabled: input.applicationAuth !== undefined,
        ...configuration,
      })
      .returning();
    if (!createdConfiguration) {
      throw new Error("Application auth configuration could not be created");
    }
    if (input.applicationAuth) {
      const applicationAuth = input.applicationAuth;
      await this.connection.insert(applicationAuthOrigin).values({
        applicationId: input.applicationId,
        origin: applicationAuth.origin,
      });
      const [createdClient] = await this.connection
        .insert(applicationOauthClient)
        .values({
          id: await this.generateUuidV7(),
          applicationId: input.applicationId,
          clientId: applicationAuth.clientId,
          clientSecret: null,
          disabled: false,
          skipConsent: true,
          enableEndSession: true,
          scopes: [...APPLICATION_OAUTH_SCOPES],
          userId: null,
          name: `${input.displayName} Web client`,
          redirectUris: [applicationAuth.redirectUri],
          postLogoutRedirectUris: [applicationAuth.postLogoutRedirectUri],
          tokenEndpointAuthMethod: "none",
          grantTypes: [...APPLICATION_OAUTH_GRANT_TYPES],
          responseTypes: [...APPLICATION_OAUTH_RESPONSE_TYPES],
          public: true,
          type: "native",
          requirePKCE: true,
          referenceId: input.applicationId,
          metadata: createApplicationOAuthClientPolicyMetadata({
            applicationId: input.applicationId,
            clientId: applicationAuth.clientId,
            resource: createdConfiguration.resource,
          }),
          resourceAudience: createdConfiguration.resource,
          protocolPolicyVersion: APPLICATION_OAUTH_PROTOCOL_POLICY_VERSION,
          environment: applicationAuth.origin.startsWith("https://")
            ? "production"
            : "development",
          createdBy: applicationAuth.actorId,
          updatedBy: applicationAuth.actorId,
        })
        .returning({ id: applicationOauthClient.id });
      if (!createdClient) {
        throw new Error("Application OAuth client could not be created");
      }
    }
    return {
      application: createdApplication,
      configuration: createdConfiguration,
    };
  }

  /** Allocate the canonical IAM-owned UUID before the audited create attempt. */
  @ReadOnly()
  allocateApplicationId(): Promise<string> {
    return this.generateUuidV7();
  }

  @ReadOnly()
  async applicationExists(input: {
    organizationId: string;
    applicationId: string;
  }): Promise<boolean> {
    const [record] = await this.connection
      .select({ id: application.id })
      .from(application)
      .where(
        and(
          eq(application.id, input.applicationId),
          eq(application.organizationId, input.organizationId)
        )
      )
      .limit(1);

    return Boolean(record);
  }

  @Transactional()
  async deleteServiceLinkedApplication(input: {
    organizationId: string;
    applicationId: string;
  }): Promise<boolean> {
    const rows = await this.connection
      .delete(application)
      .where(
        and(
          eq(application.id, input.applicationId),
          eq(application.organizationId, input.organizationId)
        )
      )
      .returning({ id: application.id });

    return rows.length > 0;
  }

  @Transactional()
  async updateApplication(
    input: UpdateAdminApplicationInput
  ): Promise<number | null> {
    const revision = await this.claimRevision(
      input.applicationId,
      input.expectedRevision
    );
    if (revision === null) return null;
    const rows = await this.connection
      .update(application)
      .set({ ...input.patch, updatedAt: new Date() })
      .where(
        and(
          eq(application.id, input.applicationId),
          eq(application.organizationId, input.organizationId),
          isNull(application.deletedAt)
        )
      )
      .returning({ id: application.id });
    if (rows.length !== 1) throw new Error("Application could not be updated");
    return revision;
  }

  @Transactional()
  async archiveApplication(input: {
    organizationId: string;
    applicationId: string;
    expectedRevision: number;
  }): Promise<number | null> {
    const revision = await this.claimRevision(
      input.applicationId,
      input.expectedRevision,
      { realmEnabled: false }
    );
    if (revision === null) return null;
    const now = new Date();
    const rows = await this.connection
      .update(application)
      .set({ deletedAt: now, updatedAt: now })
      .where(
        and(
          eq(application.id, input.applicationId),
          eq(application.organizationId, input.organizationId),
          isNull(application.deletedAt)
        )
      )
      .returning({ id: application.id });
    if (rows.length !== 1) throw new Error("Application could not be archived");
    return revision;
  }

  @Transactional()
  async updateAuth(
    input: UpdateAdminApplicationAuthInput
  ): Promise<ApplicationAuthConfigurationRecord | null> {
    const current = await this.findConfiguration(input.applicationId);
    if (!current || current.revision !== input.expectedRevision) return null;
    const mutable = applicationAuthMutableConfigurationSchema.parse({
      registrationMode: current.registrationMode,
      passwordSignUpEnabled: current.passwordSignUpEnabled,
      passwordSignInEnabled: current.passwordSignInEnabled,
      passwordResetEnabled: current.passwordResetEnabled,
      emailVerificationRequired: current.emailVerificationRequired,
      emailOtpSignInEnabled: current.emailOtpSignInEnabled,
      emailOtpSignUpEnabled: current.emailOtpSignUpEnabled,
      consentMode: current.consentMode,
      accessTokenTtlSeconds: current.accessTokenTtlSeconds,
      idTokenTtlSeconds: current.idTokenTtlSeconds,
      refreshTokenTtlSeconds: current.refreshTokenTtlSeconds,
      sessionTtlSeconds: current.sessionTtlSeconds,
      brandingJson: current.brandingJson,
      defaultLocale: current.defaultLocale,
      ...input.patch,
    });
    const [updated] = await this.connection
      .update(applicationAuthConfiguration)
      .set({
        ...mutable,
        revision: sql`${applicationAuthConfiguration.revision} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(applicationAuthConfiguration.applicationId, input.applicationId),
          eq(applicationAuthConfiguration.revision, input.expectedRevision)
        )
      )
      .returning();
    if (!updated) return null;

    if (input.trustedOrigins !== undefined) {
      await this.connection
        .delete(applicationAuthOrigin)
        .where(eq(applicationAuthOrigin.applicationId, input.applicationId));
      if (input.trustedOrigins.length > 0) {
        await this.connection.insert(applicationAuthOrigin).values(
          input.trustedOrigins.map((origin) => ({
            applicationId: input.applicationId,
            origin,
          }))
        );
      }
    }
    if (input.emailDelivery !== undefined) {
      const delivery = applicationAuthDeliveryProfileSchema.parse(
        input.emailDelivery
      );
      await this.connection
        .insert(applicationAuthDeliveryProfile)
        .values({ applicationId: input.applicationId, ...delivery })
        .onConflictDoUpdate({
          target: applicationAuthDeliveryProfile.applicationId,
          set: { ...delivery, updatedAt: new Date() },
        });
    }
    return updated;
  }

  @Transactional()
  async setRealmEnabled(input: {
    applicationId: string;
    enabled: boolean;
    expectedRevision: number;
  }): Promise<ApplicationAuthConfigurationRecord | null> {
    const [updated] = await this.connection
      .update(applicationAuthConfiguration)
      .set({
        realmEnabled: input.enabled,
        revision: sql`${applicationAuthConfiguration.revision} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(applicationAuthConfiguration.applicationId, input.applicationId),
          eq(applicationAuthConfiguration.revision, input.expectedRevision)
        )
      )
      .returning();
    return updated ?? null;
  }

  @Transactional()
  async updateAuthMethod(input: {
    applicationId: string;
    methodId: "password" | "email_otp";
    enabledCapabilities: readonly ("sign_in" | "sign_up" | "password_reset")[];
    expectedRevision: number;
  }): Promise<ApplicationAuthConfigurationRecord | null> {
    const enabled = new Set(input.enabledCapabilities);
    const patch =
      input.methodId === "password"
        ? {
            passwordSignInEnabled: enabled.has("sign_in"),
            passwordSignUpEnabled: enabled.has("sign_up"),
            passwordResetEnabled: enabled.has("password_reset"),
          }
        : {
            emailOtpSignInEnabled: enabled.has("sign_in"),
            emailOtpSignUpEnabled: enabled.has("sign_up"),
          };
    const [updated] = await this.connection
      .update(applicationAuthConfiguration)
      .set({
        ...patch,
        revision: sql`${applicationAuthConfiguration.revision} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(applicationAuthConfiguration.applicationId, input.applicationId),
          eq(applicationAuthConfiguration.revision, input.expectedRevision)
        )
      )
      .returning();
    return updated ?? null;
  }

  @Transactional()
  async replaceAuthMethods(input: {
    applicationId: string;
    enabledMethods: readonly ("password" | "email_otp")[];
    expectedRevision: number;
  }): Promise<ApplicationAuthConfigurationRecord | null> {
    const enabled = new Set(input.enabledMethods);
    const [updated] = await this.connection
      .update(applicationAuthConfiguration)
      .set({
        passwordSignInEnabled: enabled.has("password"),
        passwordSignUpEnabled: enabled.has("password"),
        emailOtpSignInEnabled: enabled.has("email_otp"),
        emailOtpSignUpEnabled: enabled.has("email_otp"),
        revision: sql`${applicationAuthConfiguration.revision} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(applicationAuthConfiguration.applicationId, input.applicationId),
          eq(applicationAuthConfiguration.revision, input.expectedRevision)
        )
      )
      .returning();
    return updated ?? null;
  }

  @Transactional()
  async configureProvider(
    input: ConfigureAdminApplicationProviderInput
  ): Promise<AdminApplicationProviderRecord | "already_configured" | null> {
    const provider = parseApplicationAuthProviderName(input.provider);
    const [existing] = await this.connection
      .select({ id: applicationAuthProvider.id })
      .from(applicationAuthProvider)
      .where(
        and(
          eq(applicationAuthProvider.applicationId, input.applicationId),
          eq(applicationAuthProvider.provider, provider)
        )
      )
      .limit(1);
    if (existing) return "already_configured";
    const credentials = applicationAuthProviderCredentialsSchema.parse({
      provider,
      enabled: false,
      clientId: input.clientId,
      clientSecret: input.clientSecret,
      scopes: [...input.scopes],
      updatedBy: input.actorId,
    });
    const revision = await this.claimRevision(
      input.applicationId,
      input.expectedRevision
    );
    if (revision === null) return null;
    const encrypted = this.encryptProviderCredentials(
      input.applicationId,
      provider,
      credentials.clientId,
      credentials.clientSecret
    );
    const [created] = await this.connection
      .insert(applicationAuthProvider)
      .values({
        applicationId: input.applicationId,
        provider,
        enabled: false,
        encryptedClientId: encrypted.clientId,
        encryptedClientSecret: encrypted.clientSecret,
        secretKeyVersion: encrypted.keyVersion,
        scopesJson: [...credentials.scopes],
        updatedBy: input.actorId,
      })
      .returning();
    if (!created) throw new Error("Application auth provider could not be configured");
    return mapProviderRecord(created, revision);
  }

  @Transactional()
  async updateProvider(
    input: UpdateAdminApplicationProviderInput
  ): Promise<AdminApplicationProviderRecord | "not_configured" | null> {
    const provider = parseApplicationAuthProviderName(input.provider);
    const current = await this.findProvider(input.applicationId, provider);
    if (!current) return "not_configured";
    const scopes = input.scopes
      ? applicationAuthProviderScopesSchema.parse([...input.scopes])
      : applicationAuthProviderScopesSchema.parse(current.scopesJson);
    if (new Set(scopes).size !== scopes.length) {
      throw new Error("Application auth provider scopes are duplicated");
    }
    assertApplicationSocialProviderScopes(provider, scopes);
    if (input.enabled === true) this.assertStoredProviderCredentials(current, provider);
    const revision = await this.claimRevision(
      input.applicationId,
      input.expectedRevision
    );
    if (revision === null) return null;
    const [updated] = await this.connection
      .update(applicationAuthProvider)
      .set({
        ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
        ...(input.scopes !== undefined ? { scopesJson: [...scopes] } : {}),
        updatedAt: new Date(),
        updatedBy: input.actorId,
      })
      .where(
        and(
          eq(applicationAuthProvider.id, current.id),
          eq(applicationAuthProvider.applicationId, input.applicationId),
          eq(applicationAuthProvider.provider, provider)
        )
      )
      .returning();
    if (!updated) throw new Error("Application auth provider could not be updated");
    return mapProviderRecord(updated, revision);
  }

  @Transactional()
  async rotateProviderCredentials(
    input: RotateAdminApplicationProviderCredentialsInput
  ): Promise<AdminApplicationProviderRecord | "not_configured" | null> {
    const provider = parseApplicationAuthProviderName(input.provider);
    const current = await this.findProvider(input.applicationId, provider);
    if (!current) return "not_configured";
    const scopes = applicationAuthProviderScopesSchema.parse(current.scopesJson);
    const credentials = applicationAuthProviderCredentialsSchema.parse({
      provider,
      enabled: current.enabled,
      clientId: input.clientId,
      clientSecret: input.clientSecret,
      scopes,
      updatedBy: input.actorId,
    });
    const revision = await this.claimRevision(
      input.applicationId,
      input.expectedRevision
    );
    if (revision === null) return null;
    const encrypted = this.encryptProviderCredentials(
      input.applicationId,
      provider,
      credentials.clientId,
      credentials.clientSecret
    );
    const [updated] = await this.connection
      .update(applicationAuthProvider)
      .set({
        encryptedClientId: encrypted.clientId,
        encryptedClientSecret: encrypted.clientSecret,
        secretKeyVersion: encrypted.keyVersion,
        updatedAt: new Date(),
        updatedBy: input.actorId,
      })
      .where(
        and(
          eq(applicationAuthProvider.id, current.id),
          eq(applicationAuthProvider.applicationId, input.applicationId),
          eq(applicationAuthProvider.provider, provider)
        )
      )
      .returning();
    if (!updated) throw new Error("Application auth provider credentials could not be rotated");
    return mapProviderRecord(updated, revision);
  }

  @Transactional()
  async deleteProviderCredentials(input: {
    applicationId: string;
    provider: ApplicationAuthProviderName;
    expectedRevision: number;
  }): Promise<"deleted" | "not_configured" | "enabled" | "conflict"> {
    const provider = parseApplicationAuthProviderName(input.provider);
    const current = await this.findProvider(input.applicationId, provider);
    if (!current) return "not_configured";
    if (current.enabled) return "enabled";
    const revision = await this.claimRevision(
      input.applicationId,
      input.expectedRevision
    );
    if (revision === null) return "conflict";
    const rows = await this.connection
      .delete(applicationAuthProvider)
      .where(
        and(
          eq(applicationAuthProvider.id, current.id),
          eq(applicationAuthProvider.applicationId, input.applicationId),
          eq(applicationAuthProvider.provider, provider),
          eq(applicationAuthProvider.enabled, false)
        )
      )
      .returning({ id: applicationAuthProvider.id });
    if (rows.length !== 1) throw new Error("Application auth provider credentials could not be deleted");
    return "deleted";
  }

  @ReadOnly()
  async prepareProviderValidation(input: {
    applicationId: string;
    provider: ApplicationAuthProviderName;
    expectedRevision: number;
  }): Promise<
    | {
        status: "ready";
        revision: number;
        clientId: string;
        clientSecret: string;
        scopes: readonly string[];
      }
    | { status: "invalid"; reasonCode: string; revision: number }
    | { status: "not_configured"; revision: number }
    | { status: "conflict"; revision: number }
  > {
    const configuration = await this.findConfiguration(input.applicationId);
    if (!configuration) {
      return { status: "not_configured", revision: input.expectedRevision };
    }
    if (configuration.revision !== input.expectedRevision) {
      return { status: "conflict", revision: configuration.revision };
    }
    const provider = parseApplicationAuthProviderName(input.provider);
    const current = await this.findProvider(input.applicationId, provider);
    if (!current) {
      return { status: "not_configured", revision: configuration.revision };
    }
    try {
      const scopes = applicationAuthProviderScopesSchema.parse(current.scopesJson);
      assertApplicationSocialProviderScopes(provider, scopes);
      const credentials = this.readStoredProviderCredentials(current, provider);
      return {
        status: "ready",
        revision: configuration.revision,
        clientId: credentials.clientId,
        clientSecret: credentials.clientSecret,
        scopes: Object.freeze([...scopes]),
      };
    } catch {
      return {
        status: "invalid",
        reasonCode: "CONFIGURATION_INVALID",
        revision: configuration.revision,
      };
    }
  }

  @ReadOnly()
  async hasEnabledProvider(
    applicationId: string,
    excludeProvider?: ApplicationAuthProviderName
  ): Promise<boolean> {
    const [record] = await this.connection
      .select({ id: applicationAuthProvider.id })
      .from(applicationAuthProvider)
      .where(
        and(
          eq(applicationAuthProvider.applicationId, applicationId),
          eq(applicationAuthProvider.enabled, true),
          excludeProvider
            ? ne(applicationAuthProvider.provider, excludeProvider)
            : undefined
        )
      )
      .limit(1);
    return Boolean(record);
  }

  private async findConfiguration(
    applicationId: string
  ): Promise<ApplicationAuthConfigurationRecord | null> {
    const [record] = await this.connection
      .select()
      .from(applicationAuthConfiguration)
      .where(eq(applicationAuthConfiguration.applicationId, applicationId))
      .limit(1);
    return record ?? null;
  }

  private async findProvider(
    applicationId: string,
    provider: ApplicationAuthProviderName
  ): Promise<typeof applicationAuthProvider.$inferSelect | null> {
    const [record] = await this.connection
      .select()
      .from(applicationAuthProvider)
      .where(
        and(
          eq(applicationAuthProvider.applicationId, applicationId),
          eq(applicationAuthProvider.provider, provider)
        )
      )
      .limit(1);
    return record ?? null;
  }

  private async claimRevision(
    applicationId: string,
    expectedRevision: number,
    patch: Partial<Pick<ApplicationAuthConfigurationRecord, "realmEnabled">> = {}
  ): Promise<number | null> {
    const [updated] = await this.connection
      .update(applicationAuthConfiguration)
      .set({
        ...patch,
        revision: sql`${applicationAuthConfiguration.revision} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(applicationAuthConfiguration.applicationId, applicationId),
          eq(applicationAuthConfiguration.revision, expectedRevision)
        )
      )
      .returning({ revision: applicationAuthConfiguration.revision });
    return updated?.revision ?? null;
  }

  private encryptProviderCredentials(
    applicationId: string,
    provider: ApplicationAuthProviderName,
    clientId: string,
    clientSecret: string
  ) {
    const keyVersion = this.keyring.activeVersion;
    return {
      keyVersion,
      clientId: this.keyring.encrypt(clientId, {
        applicationId,
        model: "provider",
        provider,
        field: "clientId",
      }),
      clientSecret: this.keyring.encrypt(clientSecret, {
        applicationId,
        model: "provider",
        provider,
        field: "clientSecret",
      }),
    };
  }

  private assertStoredProviderCredentials(
    record: typeof applicationAuthProvider.$inferSelect,
    provider: ApplicationAuthProviderName
  ): void {
    this.readStoredProviderCredentials(record, provider);
  }

  private readStoredProviderCredentials(
    record: typeof applicationAuthProvider.$inferSelect,
    provider: ApplicationAuthProviderName
  ): { clientId: string; clientSecret: string } {
    this.keyring.assertVersionsAvailable([record.secretKeyVersion]);
    if (
      this.keyring.getEnvelopeKeyVersion(record.encryptedClientId) !==
        record.secretKeyVersion ||
      this.keyring.getEnvelopeKeyVersion(record.encryptedClientSecret) !==
        record.secretKeyVersion
    ) {
      throw new Error("Application auth provider key version mismatch");
    }
    const clientId = this.keyring.decrypt(record.encryptedClientId, {
      applicationId: record.applicationId,
      model: "provider",
      provider,
      field: "clientId",
    });
    const clientSecret = this.keyring.decrypt(record.encryptedClientSecret, {
      applicationId: record.applicationId,
      model: "provider",
      provider,
      field: "clientSecret",
    });
    applicationAuthProviderCredentialsSchema.parse({
      provider,
      enabled: true,
      clientId,
      clientSecret,
      scopes: applicationAuthProviderScopesSchema.parse(record.scopesJson),
      updatedBy: record.updatedBy,
    });
    return { clientId, clientSecret };
  }
}

/**
 * Keep a derived presentation value inside its own contract without narrowing
 * the source application's display-name contract or splitting a surrogate pair.
 */
function truncateUtf16(value: string, maximumLength: number): string {
  if (value.length <= maximumLength) return value;
  let end = maximumLength;
  const lastCodeUnit = value.charCodeAt(end - 1);
  if (lastCodeUnit >= 0xd800 && lastCodeUnit <= 0xdbff) end -= 1;
  return value.slice(0, end).trimEnd();
}

function mapProviderRecord(
  record: typeof applicationAuthProvider.$inferSelect,
  revision: number
): AdminApplicationProviderRecord {
  const provider = parseApplicationAuthProviderName(record.provider);
  const scopes = applicationAuthProviderScopesSchema.parse(record.scopesJson);
  assertApplicationSocialProviderScopes(provider, scopes);
  return {
    applicationId: record.applicationId,
    provider,
    enabled: record.enabled,
    scopes: Object.freeze([...scopes]),
    revision,
    updatedAt: record.updatedAt,
    updatedBy: record.updatedBy,
  };
}

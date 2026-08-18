import type { TransactionManager } from "@shopana/shared-kernel";
import { ReadOnly, Transactional } from "@shopana/shared-kernel";
import { and, count, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import type { Database } from "../infrastructure/db/database.js";
import {
  DEFAULT_APPLICATION_AUTH_CONFIGURATION,
  applicationAuthConfigurationPatchSchema,
  applicationAuthDeliveryProfileSchema,
  applicationAuthMutableConfigurationSchema,
  applicationAuthProviderCredentialsSchema,
  applicationAuthProviderScopesSchema,
  applicationAuthProviderStateSchema,
  createApplicationResource,
  normalizeApplicationAuthOrigin,
  type ApplicationAuthConfigurationPatch,
  type ApplicationAuthDeliveryProfileInput,
  type ApplicationAuthMutableConfiguration,
  type ApplicationAuthProviderCredentialsInput,
  type ApplicationAuthProviderStateInput,
} from "../auth/applicationAuthConfiguration.js";
import {
  APPLICATION_AUTH_PROVIDER_NAMES,
  assertApplicationSocialProviderScopes,
  parseApplicationAuthProviderName,
  type ApplicationAuthProviderName,
} from "../auth/applicationSocialProviders.js";
import { assertApplicationId } from "../auth/AuthScope.js";
import { ApplicationAuthKeyring } from "../services/ApplicationAuthKeyring.js";
import {
  createApplicationAuthLiveStateInvalidationEvent,
  type ApplicationAuthLiveStateInvalidationBus,
} from "../events/application-auth/index.js";
import { BaseRepository } from "./BaseRepository.js";
import {
  application,
  applicationAuthConfiguration,
  applicationAuthDeliveryProfile,
  applicationAuthOrigin,
  applicationAuthProvider,
  applicationAuthorizationContext,
  applicationJwks,
  applicationOauthAccessToken,
  applicationOauthRefreshToken,
  applicationSession,
  applicationVerification,
  organization,
  type Application,
  type ApplicationAuthConfigurationRecord,
  type ApplicationAuthDeliveryProfile,
  type ApplicationAuthOrigin,
} from "./models/index.js";

export interface ProvisionApplicationInput {
  organizationId: string;
  name: string;
  displayName: string;
  description?: string | null;
  configuration?: Partial<ApplicationAuthMutableConfiguration>;
}

export interface ProvisionedApplication {
  application: Application;
  configuration: ApplicationAuthConfigurationRecord;
}

const provisionApplicationSchema = z
  .object({
    organizationId: z.string().uuid(),
    name: z
      .string()
      .trim()
      .min(1)
      .max(128)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    displayName: z.string().trim().min(1).max(256),
    description: z.string().trim().max(4000).nullable().optional(),
    configuration: applicationAuthConfigurationPatchSchema.optional(),
  })
  .strict();

export interface ApplicationAuthProviderSummary {
  id: string;
  applicationId: string;
  provider: ApplicationAuthProviderName;
  enabled: boolean;
  scopes: string[];
  secretKeyVersion: number;
  updatedAt: Date;
  updatedBy: string;
}

export interface ApplicationAuthProviderCredentials
  extends ApplicationAuthProviderSummary {
  enabled: true;
  clientId: string;
  clientSecret: string;
}

export type ApplicationAuthConfiguredProvider =
  | ApplicationAuthProviderCredentials
  | (ApplicationAuthProviderSummary & {
      enabled: false;
      clientId?: never;
      clientSecret?: never;
    });

export class ApplicationAuthConfigurationRepository extends BaseRepository {
  constructor(
    db: Database,
    txManager: TransactionManager<Database>,
    private readonly keyring: ApplicationAuthKeyring,
    private readonly invalidation: ApplicationAuthLiveStateInvalidationBus
  ) {
    super(db, txManager);
  }

  @Transactional()
  async provisionApplication(
    input: ProvisionApplicationInput
  ): Promise<ProvisionedApplication> {
    const value = provisionApplicationSchema.parse(input);
    const configuration = applicationAuthMutableConfigurationSchema.parse({
      ...DEFAULT_APPLICATION_AUTH_CONFIGURATION,
      ...value.configuration,
      brandingJson: {
        ...DEFAULT_APPLICATION_AUTH_CONFIGURATION.brandingJson,
        ...value.configuration?.brandingJson,
      },
    });
    const [activeOrganization] = await this.connection
      .select({ id: organization.id })
      .from(organization)
      .where(
        and(
          eq(organization.id, value.organizationId),
          isNull(organization.deletedAt)
        )
      )
      .limit(1);
    if (!activeOrganization) {
      throw new Error("Active organization does not exist");
    }
    const applicationId = await this.generateUuidV7();
    const [createdApplication] = await this.connection
      .insert(application)
      .values({
        id: applicationId,
        organizationId: value.organizationId,
        name: value.name,
        displayName: value.displayName,
        description: value.description,
      })
      .returning();
    if (!createdApplication) {
      throw new Error("Application could not be provisioned");
    }

    const [createdConfiguration] = await this.connection
      .insert(applicationAuthConfiguration)
      .values({
        applicationId,
        resource: createApplicationResource(applicationId),
        secretKeyVersion: this.keyring.activeVersion,
        ...configuration,
      })
      .returning();
    if (!createdConfiguration) {
      throw new Error("Application auth configuration could not be provisioned");
    }

    return {
      application: createdApplication,
      configuration: createdConfiguration,
    };
  }

  /** Idempotent runtime companion to the migration backfill. */
  @Transactional()
  async backfillMissingConfigurations(): Promise<number> {
    this.keyring.assertVersionsAvailable([this.keyring.activeVersion]);
    const result = await this.connection.execute(sql`
      INSERT INTO iam.application_auth_configuration (
        application_id,
        revision,
        realm_enabled,
        resource,
        registration_mode,
        password_sign_up_enabled,
        password_sign_in_enabled,
        password_reset_enabled,
        email_verification_required,
        email_otp_sign_in_enabled,
        email_otp_sign_up_enabled,
        phone_otp_sign_in_enabled,
        phone_otp_sign_up_enabled,
        consent_mode,
        access_token_ttl_seconds,
        id_token_ttl_seconds,
        refresh_token_ttl_seconds,
        session_ttl_seconds,
        secret_key_version,
        branding_json,
        default_locale
      )
      SELECT
        id,
        1,
        false,
        'urn:shopana:application:' || id::text,
        'disabled',
        false,
        false,
        false,
        true,
        false,
        false,
        false,
        false,
        'explicit',
        900,
        3600,
        2592000,
        2592000,
        ${this.keyring.activeVersion},
        '{}'::jsonb,
        'en'
      FROM iam.application
      ON CONFLICT (application_id) DO NOTHING
      RETURNING application_id
    `);
    return result.length;
  }

  @ReadOnly()
  async find(
    applicationId: string
  ): Promise<ApplicationAuthConfigurationRecord | null> {
    assertApplicationId(applicationId);
    const [record] = await this.connection
      .select()
      .from(applicationAuthConfiguration)
      .where(eq(applicationAuthConfiguration.applicationId, applicationId))
      .limit(1);
    return record ?? null;
  }

  @ReadOnly()
  async findActive(
    applicationId: string
  ): Promise<
    (ApplicationAuthConfigurationRecord & { organizationId: string }) | null
  > {
    assertApplicationId(applicationId);
    const [record] = await this.connection
      .select({
        configuration: applicationAuthConfiguration,
        organizationId: application.organizationId,
      })
      .from(applicationAuthConfiguration)
      .innerJoin(
        application,
        eq(application.id, applicationAuthConfiguration.applicationId)
      )
      .innerJoin(organization, eq(organization.id, application.organizationId))
      .where(
        and(
          eq(applicationAuthConfiguration.applicationId, applicationId),
          eq(applicationAuthConfiguration.realmEnabled, true),
          isNull(application.deletedAt),
          isNull(organization.deletedAt)
        )
      )
      .limit(1);
    return record
      ? { ...record.configuration, organizationId: record.organizationId }
      : null;
  }

  @Transactional()
  async update(
    applicationId: string,
    expectedRevision: number,
    patch: ApplicationAuthConfigurationPatch
  ): Promise<ApplicationAuthConfigurationRecord> {
    const current = await this.requireConfiguration(applicationId);
    if (current.revision !== expectedRevision) {
      throw new Error("Application auth configuration revision conflict");
    }
    const parsedPatch = applicationAuthConfigurationPatchSchema.parse(patch);
    const mutable = applicationAuthMutableConfigurationSchema.parse({
      registrationMode: current.registrationMode,
      passwordSignUpEnabled: current.passwordSignUpEnabled,
      passwordSignInEnabled: current.passwordSignInEnabled,
      passwordResetEnabled: current.passwordResetEnabled,
      emailVerificationRequired: current.emailVerificationRequired,
      emailOtpSignInEnabled: current.emailOtpSignInEnabled,
      emailOtpSignUpEnabled: current.emailOtpSignUpEnabled,
      phoneOtpSignInEnabled: current.phoneOtpSignInEnabled,
      phoneOtpSignUpEnabled: current.phoneOtpSignUpEnabled,
      consentMode: current.consentMode,
      accessTokenTtlSeconds: current.accessTokenTtlSeconds,
      idTokenTtlSeconds: current.idTokenTtlSeconds,
      refreshTokenTtlSeconds: current.refreshTokenTtlSeconds,
      sessionTtlSeconds: current.sessionTtlSeconds,
      brandingJson: current.brandingJson,
      defaultLocale: current.defaultLocale,
      ...parsedPatch,
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
          eq(applicationAuthConfiguration.applicationId, applicationId),
          eq(applicationAuthConfiguration.revision, expectedRevision)
        )
      )
      .returning();
    if (!updated) {
      throw new Error("Application auth configuration revision conflict");
    }
    return updated;
  }

  @Transactional()
  async enableRealm(
    applicationId: string,
    expectedRevision: number
  ): Promise<ApplicationAuthConfigurationRecord> {
    const configuration = await this.requireConfiguration(applicationId);
    this.keyring.assertVersionsAvailable(
      await this.listUsedKeyVersions(applicationId)
    );
    if (configuration.revision !== expectedRevision) {
      throw new Error("Application auth configuration revision conflict");
    }
    const [updated] = await this.connection
      .update(applicationAuthConfiguration)
      .set({
        realmEnabled: true,
        revision: sql`${applicationAuthConfiguration.revision} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(applicationAuthConfiguration.applicationId, applicationId),
          eq(applicationAuthConfiguration.revision, expectedRevision)
        )
      )
      .returning();
    if (!updated) {
      throw new Error("Application auth configuration revision conflict");
    }
    return updated;
  }

  async emergencyDisable(
    applicationId: string
  ): Promise<ApplicationAuthConfigurationRecord> {
    assertApplicationId(applicationId);
    const updated = await this.txManager.run(async () => {
      const [record] = await this.connection
        .update(applicationAuthConfiguration)
        .set({
          realmEnabled: false,
          revision: sql`${applicationAuthConfiguration.revision} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(applicationAuthConfiguration.applicationId, applicationId))
        .returning();
      return record ?? null;
    });
    if (!updated) {
      throw new Error("Application auth configuration does not exist");
    }
    await this.invalidation.publish(
      createApplicationAuthLiveStateInvalidationEvent({
        kind: "application",
        applicationId,
      })
    );
    return updated;
  }

  @Transactional()
  async rotateRealmSecret(
    applicationId: string,
    expectedRevision: number,
    targetKeyVersion: number
  ): Promise<ApplicationAuthConfigurationRecord> {
    this.keyring.assertVersionsAvailable([targetKeyVersion]);
    const now = new Date();
    const [updated] = await this.connection
      .update(applicationAuthConfiguration)
      .set({
        secretKeyVersion: targetKeyVersion,
        revision: sql`${applicationAuthConfiguration.revision} + 1`,
        updatedAt: now,
      })
      .where(
        and(
          eq(applicationAuthConfiguration.applicationId, applicationId),
          eq(applicationAuthConfiguration.revision, expectedRevision)
        )
      )
      .returning();
    if (!updated) {
      throw new Error("Application auth configuration revision conflict");
    }

    await this.connection
      .delete(applicationAuthorizationContext)
      .where(eq(applicationAuthorizationContext.applicationId, applicationId));
    await this.connection
      .delete(applicationVerification)
      .where(eq(applicationVerification.applicationId, applicationId));
    await this.connection
      .update(applicationOauthRefreshToken)
      .set({ revoked: now, sessionId: null })
      .where(
        and(
          eq(applicationOauthRefreshToken.applicationId, applicationId),
          isNull(applicationOauthRefreshToken.revoked)
        )
      );
    await this.connection
      .delete(applicationOauthAccessToken)
      .where(eq(applicationOauthAccessToken.applicationId, applicationId));
    await this.connection
      .delete(applicationSession)
      .where(eq(applicationSession.applicationId, applicationId));
    return updated;
  }

  @Transactional()
  async addOrigin(
    applicationId: string,
    origin: string,
    options: { allowInsecureLocalhost: boolean }
  ): Promise<ApplicationAuthOrigin> {
    assertApplicationId(applicationId);
    const normalizedOrigin = normalizeApplicationAuthOrigin(origin, options);
    const [created] = await this.connection
      .insert(applicationAuthOrigin)
      .values({ applicationId, origin: normalizedOrigin })
      .returning();
    if (!created) throw new Error("Application auth origin could not be created");
    await this.bumpRevision(applicationId);
    return created;
  }

  @ReadOnly()
  async listOrigins(applicationId: string): Promise<ApplicationAuthOrigin[]> {
    assertApplicationId(applicationId);
    return this.connection
      .select()
      .from(applicationAuthOrigin)
      .where(eq(applicationAuthOrigin.applicationId, applicationId));
  }

  @Transactional()
  async removeOrigin(applicationId: string, originId: string): Promise<boolean> {
    assertApplicationId(applicationId);
    const rows = await this.connection
      .delete(applicationAuthOrigin)
      .where(
        and(
          eq(applicationAuthOrigin.applicationId, applicationId),
          eq(applicationAuthOrigin.id, originId)
        )
      )
      .returning({ id: applicationAuthOrigin.id });
    if (rows.length === 1) {
      await this.bumpRevision(applicationId);
    }
    return rows.length === 1;
  }

  @Transactional()
  async upsertProvider(
    applicationId: string,
    input: ApplicationAuthProviderCredentialsInput
  ): Promise<ApplicationAuthProviderSummary> {
    assertApplicationId(applicationId);
    const value = applicationAuthProviderCredentialsSchema.parse(input);
    const keyVersion = this.keyring.activeVersion;
    const encryptedClientId = this.keyring.encrypt(value.clientId, {
      applicationId,
      model: "provider",
      provider: value.provider,
      field: "clientId",
    });
    const encryptedClientSecret = this.keyring.encrypt(value.clientSecret, {
      applicationId,
      model: "provider",
      provider: value.provider,
      field: "clientSecret",
    });
    const now = new Date();
    const [record] = await this.connection
      .insert(applicationAuthProvider)
      .values({
        applicationId,
        provider: value.provider,
        enabled: value.enabled,
        encryptedClientId,
        encryptedClientSecret,
        secretKeyVersion: keyVersion,
        scopesJson: value.scopes,
        updatedBy: value.updatedBy,
      })
      .onConflictDoUpdate({
        target: [
          applicationAuthProvider.applicationId,
          applicationAuthProvider.provider,
        ],
        set: {
          enabled: value.enabled,
          encryptedClientId,
          encryptedClientSecret,
          secretKeyVersion: keyVersion,
          scopesJson: value.scopes,
          updatedAt: now,
          updatedBy: value.updatedBy,
        },
      })
      .returning();
    if (!record) throw new Error("Application auth provider could not be saved");
    await this.bumpRevision(applicationId);
    return providerSummary(record);
  }

  @ReadOnly()
  async listConfiguredProviders(
    applicationId: string
  ): Promise<ApplicationAuthConfiguredProvider[]> {
    assertApplicationId(applicationId);
    const records = await this.connection
      .select()
      .from(applicationAuthProvider)
      .where(
        eq(applicationAuthProvider.applicationId, applicationId)
      );
    return records
      .map((record) => {
        if (record.applicationId !== applicationId) {
          throw new Error("Application auth provider scope mismatch");
        }
        const summary = providerSummary(record);
        this.keyring.assertVersionsAvailable([record.secretKeyVersion]);
        if (
          this.keyring.getEnvelopeKeyVersion(record.encryptedClientId) !==
            record.secretKeyVersion ||
          this.keyring.getEnvelopeKeyVersion(record.encryptedClientSecret) !==
            record.secretKeyVersion
        ) {
          throw new Error("Application auth provider key version mismatch");
        }
        if (!summary.enabled) {
          return { ...summary, enabled: false as const };
        }

        const clientId = this.keyring.decrypt(record.encryptedClientId, {
          applicationId,
          model: "provider",
          provider: summary.provider,
          field: "clientId",
        });
        const clientSecret = this.keyring.decrypt(
          record.encryptedClientSecret,
          {
            applicationId,
            model: "provider",
            provider: summary.provider,
            field: "clientSecret",
          }
        );
        const validated = applicationAuthProviderCredentialsSchema.parse({
          provider: summary.provider,
          enabled: true,
          clientId,
          clientSecret,
          scopes: summary.scopes,
          updatedBy: summary.updatedBy,
        });
        return {
          ...summary,
          enabled: true as const,
          clientId: validated.clientId,
          clientSecret: validated.clientSecret,
          scopes: validated.scopes,
        };
      })
      .sort(
        (left, right) =>
          APPLICATION_AUTH_PROVIDER_NAMES.indexOf(left.provider) -
          APPLICATION_AUTH_PROVIDER_NAMES.indexOf(right.provider)
      );
  }

  @Transactional()
  async removeProvider(
    applicationId: string,
    provider: ApplicationAuthProviderName
  ): Promise<boolean> {
    assertApplicationId(applicationId);
    const validProvider = parseApplicationAuthProviderName(provider);
    const rows = await this.connection
      .delete(applicationAuthProvider)
      .where(
        and(
          eq(applicationAuthProvider.applicationId, applicationId),
          eq(applicationAuthProvider.provider, validProvider),
          eq(applicationAuthProvider.enabled, false)
        )
      )
      .returning({ id: applicationAuthProvider.id });
    if (rows.length === 1) await this.bumpRevision(applicationId);
    return rows.length === 1;
  }

  @Transactional()
  async setProviderEnabled(
    applicationId: string,
    input: ApplicationAuthProviderStateInput
  ): Promise<ApplicationAuthProviderSummary> {
    assertApplicationId(applicationId);
    const value = applicationAuthProviderStateSchema.parse(input);
    const [current] = await this.connection
      .select()
      .from(applicationAuthProvider)
      .where(
        and(
          eq(applicationAuthProvider.applicationId, applicationId),
          eq(applicationAuthProvider.provider, value.provider)
        )
      )
      .limit(1);
    if (!current) {
      throw new Error("Application auth provider is not configured");
    }
    const summary = providerSummary(current);
    this.keyring.assertVersionsAvailable([current.secretKeyVersion]);
    if (
      this.keyring.getEnvelopeKeyVersion(current.encryptedClientId) !==
        current.secretKeyVersion ||
      this.keyring.getEnvelopeKeyVersion(current.encryptedClientSecret) !==
        current.secretKeyVersion
    ) {
      throw new Error("Application auth provider key version mismatch");
    }
    if (value.enabled) {
      applicationAuthProviderCredentialsSchema.parse({
        provider: summary.provider,
        enabled: true,
        clientId: this.keyring.decrypt(current.encryptedClientId, {
          applicationId,
          model: "provider",
          provider: summary.provider,
          field: "clientId",
        }),
        clientSecret: this.keyring.decrypt(
          current.encryptedClientSecret,
          {
            applicationId,
            model: "provider",
            provider: summary.provider,
            field: "clientSecret",
          }
        ),
        scopes: summary.scopes,
        updatedBy: value.updatedBy,
      });
    }
    const [updated] = await this.connection
      .update(applicationAuthProvider)
      .set({
        enabled: value.enabled,
        updatedAt: new Date(),
        updatedBy: value.updatedBy,
      })
      .where(
        and(
          eq(applicationAuthProvider.id, current.id),
          eq(applicationAuthProvider.applicationId, applicationId),
          eq(applicationAuthProvider.provider, value.provider)
        )
      )
      .returning();
    if (!updated) {
      throw new Error("Application auth provider could not be updated");
    }
    await this.bumpRevision(applicationId);
    return providerSummary(updated);
  }

  @Transactional()
  async upsertDeliveryProfile(
    applicationId: string,
    input: ApplicationAuthDeliveryProfileInput
  ): Promise<ApplicationAuthDeliveryProfile> {
    assertApplicationId(applicationId);
    const value = applicationAuthDeliveryProfileSchema.parse(input);
    const [record] = await this.connection
      .insert(applicationAuthDeliveryProfile)
      .values({ applicationId, ...value })
      .onConflictDoUpdate({
        target: applicationAuthDeliveryProfile.applicationId,
        set: { ...value, updatedAt: new Date() },
      })
      .returning();
    if (!record) {
      throw new Error("Application auth delivery profile could not be saved");
    }
    await this.bumpRevision(applicationId);
    return record;
  }

  @ReadOnly()
  async findDeliveryProfile(
    applicationId: string
  ): Promise<ApplicationAuthDeliveryProfile | null> {
    assertApplicationId(applicationId);
    const [record] = await this.connection
      .select()
      .from(applicationAuthDeliveryProfile)
      .where(eq(applicationAuthDeliveryProfile.applicationId, applicationId))
      .limit(1);
    return record ?? null;
  }

  @ReadOnly()
  async listUsedKeyVersions(applicationId?: string): Promise<number[]> {
    const configurationRows = await this.connection
      .select({ version: applicationAuthConfiguration.secretKeyVersion })
      .from(applicationAuthConfiguration)
      .where(
        applicationId
          ? eq(applicationAuthConfiguration.applicationId, applicationId)
          : undefined
      );
    const providerRows = await this.connection
      .select({ version: applicationAuthProvider.secretKeyVersion })
      .from(applicationAuthProvider)
      .where(
        applicationId
          ? eq(applicationAuthProvider.applicationId, applicationId)
          : undefined
      );
    const jwksRows = await this.connection
      .select({ version: applicationJwks.privateKeyKeyVersion })
      .from(applicationJwks)
      .where(
        applicationId ? eq(applicationJwks.applicationId, applicationId) : undefined
      );
    return [
      ...new Set(
        [...configurationRows, ...providerRows, ...jwksRows].map(
          (row) => row.version
        )
      ),
    ].sort((left, right) => left - right);
  }

  async assertKeyringReady(): Promise<void> {
    this.keyring.assertVersionsAvailable(await this.listUsedKeyVersions());
  }

  /**
   * Idempotent, optimistic batch used by the root-key re-encryption runbook.
   * Plaintext exists only inside this method and is never returned or logged.
   */
  @Transactional()
  async reencryptStoredSecrets(
    sourceVersion: number,
    targetVersion: number,
    batchSize = 100
  ): Promise<{ providers: number; signingKeys: number; remaining: number }> {
    if (!Number.isSafeInteger(batchSize) || batchSize < 1 || batchSize > 500) {
      throw new Error("Application auth re-encryption batch size is invalid");
    }
    this.keyring.assertVersionsAvailable([sourceVersion, targetVersion]);
    const providers = await this.connection
      .select()
      .from(applicationAuthProvider)
      .where(eq(applicationAuthProvider.secretKeyVersion, sourceVersion))
      .limit(batchSize);
    let providerCount = 0;
    for (const provider of providers) {
      const providerName = providerSummary(provider).provider;
      const clientIdContext = {
        applicationId: provider.applicationId,
        model: "provider" as const,
        provider: providerName,
        field: "clientId" as const,
      };
      const clientSecretContext = {
        applicationId: provider.applicationId,
        model: "provider" as const,
        provider: providerName,
        field: "clientSecret" as const,
      };
      const encryptedClientId = this.keyring.reencrypt(
        provider.encryptedClientId,
        clientIdContext,
        targetVersion
      );
      const encryptedClientSecret = this.keyring.reencrypt(
        provider.encryptedClientSecret,
        clientSecretContext,
        targetVersion
      );
      const rows = await this.connection
        .update(applicationAuthProvider)
        .set({
          encryptedClientId,
          encryptedClientSecret,
          secretKeyVersion: targetVersion,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(applicationAuthProvider.id, provider.id),
            eq(applicationAuthProvider.applicationId, provider.applicationId),
            eq(applicationAuthProvider.secretKeyVersion, sourceVersion),
            eq(
              applicationAuthProvider.encryptedClientId,
              provider.encryptedClientId
            ),
            eq(
              applicationAuthProvider.encryptedClientSecret,
              provider.encryptedClientSecret
            )
          )
        )
        .returning({ id: applicationAuthProvider.id });
      if (rows.length !== 1) {
        throw new Error("Application auth provider re-encryption conflict");
      }
      providerCount += 1;
    }

    const remainingCapacity = batchSize - providerCount;
    const signingKeys =
      remainingCapacity > 0
        ? await this.connection
            .select()
            .from(applicationJwks)
            .where(eq(applicationJwks.privateKeyKeyVersion, sourceVersion))
            .limit(remainingCapacity)
        : [];
    let signingKeyCount = 0;
    for (const signingKey of signingKeys) {
      const context = {
        applicationId: signingKey.applicationId,
        model: "jwks" as const,
        rowId: signingKey.id,
        field: "privateKey" as const,
      };
      const privateKey = this.keyring.reencrypt(
        signingKey.privateKey,
        context,
        targetVersion
      );
      const rows = await this.connection
        .update(applicationJwks)
        .set({ privateKey, privateKeyKeyVersion: targetVersion })
        .where(
          and(
            eq(applicationJwks.applicationId, signingKey.applicationId),
            eq(applicationJwks.id, signingKey.id),
            eq(applicationJwks.privateKeyKeyVersion, sourceVersion),
            eq(applicationJwks.privateKey, signingKey.privateKey)
          )
        )
        .returning({ id: applicationJwks.id });
      if (rows.length !== 1) {
        throw new Error("Application signing key re-encryption conflict");
      }
      signingKeyCount += 1;
    }

    const [providerRemaining, signingKeyRemaining] = await Promise.all([
      this.connection
        .select({ value: count() })
        .from(applicationAuthProvider)
        .where(eq(applicationAuthProvider.secretKeyVersion, sourceVersion)),
      this.connection
        .select({ value: count() })
        .from(applicationJwks)
        .where(eq(applicationJwks.privateKeyKeyVersion, sourceVersion)),
    ]);
    return {
      providers: providerCount,
      signingKeys: signingKeyCount,
      remaining:
        Number(providerRemaining[0]?.value ?? 0) +
        Number(signingKeyRemaining[0]?.value ?? 0),
    };
  }

  private async requireConfiguration(
    applicationId: string
  ): Promise<ApplicationAuthConfigurationRecord> {
    const configuration = await this.find(applicationId);
    if (!configuration) {
      throw new Error("Application auth configuration does not exist");
    }
    return configuration;
  }

  private async bumpRevision(applicationId: string): Promise<void> {
    const rows = await this.connection
      .update(applicationAuthConfiguration)
      .set({
        revision: sql`${applicationAuthConfiguration.revision} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(applicationAuthConfiguration.applicationId, applicationId))
      .returning({ applicationId: applicationAuthConfiguration.applicationId });
    if (rows.length !== 1) {
      throw new Error("Application auth configuration does not exist");
    }
  }
}

function providerSummary(
  record: typeof applicationAuthProvider.$inferSelect
): ApplicationAuthProviderSummary {
  const provider = parseApplicationAuthProviderName(record.provider);
  const scopes = applicationAuthProviderScopesSchema.parse(record.scopesJson);
  if (new Set(scopes).size !== scopes.length) {
    throw new Error("Application auth provider scopes are duplicated");
  }
  assertApplicationSocialProviderScopes(provider, scopes);
  return {
    id: record.id,
    applicationId: record.applicationId,
    provider,
    enabled: record.enabled,
    scopes,
    secretKeyVersion: record.secretKeyVersion,
    updatedAt: record.updatedAt,
    updatedBy: record.updatedBy,
  };
}

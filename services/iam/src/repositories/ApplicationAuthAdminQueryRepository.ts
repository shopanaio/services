import type { TransactionManager } from "@shopana/shared-kernel";
import { ReadOnly } from "@shopana/shared-kernel";
import { and, eq, inArray, isNull } from "drizzle-orm";
import {
  applicationAuthProviderScopesSchema,
} from "../auth/applicationAuthConfiguration.js";
import {
  assertApplicationSocialProviderScopes,
  parseApplicationAuthProviderName,
  type ApplicationAuthProviderName,
} from "../auth/applicationSocialProviders.js";
import type { Database } from "../infrastructure/db/database.js";
import { ApplicationAuthKeyring } from "../services/ApplicationAuthKeyring.js";
import { BaseRepository } from "./BaseRepository.js";
import type { ApplicationKey } from "./ApplicationRepository.js";
import {
  application,
  applicationAuthConfiguration,
  applicationAuthDeliveryProfile,
  applicationAuthOrigin,
  applicationAuthProvider,
  organization,
  type ApplicationAuthConfigurationRecord,
  type ApplicationAuthDeliveryProfile,
  type ApplicationAuthOrigin,
} from "./models/index.js";

export interface ApplicationAuthAdminProviderView {
  applicationId: string;
  provider: ApplicationAuthProviderName;
  configured: true;
  enabled: boolean;
  maskedClientId: string;
  scopes: readonly string[];
  revision: number;
  updatedAt: Date;
  updatedBy: string;
}

export interface ApplicationAuthAdminView {
  organizationId: string;
  applicationId: string;
  configuration: ApplicationAuthConfigurationRecord;
  origins: readonly ApplicationAuthOrigin[];
  deliveryProfile: ApplicationAuthDeliveryProfile | null;
  providers: readonly ApplicationAuthAdminProviderView[];
}

export class ApplicationAuthAdminQueryRepository extends BaseRepository {
  constructor(
    db: Database,
    txManager: TransactionManager<Database>,
    private readonly keyring: ApplicationAuthKeyring
  ) {
    super(db, txManager);
  }

  @ReadOnly()
  async getByApplicationKeys(
    keys: readonly ApplicationKey[]
  ): Promise<ApplicationAuthAdminView[]> {
    if (keys.length === 0) return [];
    const applicationIds = [...new Set(keys.map(({ id }) => id))];
    const configurations = await this.connection
      .select({
        organizationId: application.organizationId,
        configuration: applicationAuthConfiguration,
      })
      .from(applicationAuthConfiguration)
      .innerJoin(
        application,
        eq(application.id, applicationAuthConfiguration.applicationId)
      )
      .innerJoin(organization, eq(organization.id, application.organizationId))
      .where(
        and(
          inArray(applicationAuthConfiguration.applicationId, applicationIds),
          isNull(organization.deletedAt)
        )
      );
    const allowedKeys = new Set(
      keys.map(({ id, organizationId }) => `${organizationId ?? "*"}:${id}`)
    );
    const allowedConfigurations = configurations.filter(
      ({ organizationId, configuration }) =>
        allowedKeys.has(`*:${configuration.applicationId}`) ||
        allowedKeys.has(`${organizationId}:${configuration.applicationId}`)
    );
    const allowedApplicationIds = allowedConfigurations.map(
      ({ configuration }) => configuration.applicationId
    );
    if (allowedApplicationIds.length === 0) return [];

    const [origins, deliveryProfiles, providers] = await Promise.all([
      this.connection
        .select()
        .from(applicationAuthOrigin)
        .where(inArray(applicationAuthOrigin.applicationId, allowedApplicationIds))
        .orderBy(applicationAuthOrigin.applicationId, applicationAuthOrigin.origin),
      this.connection
        .select()
        .from(applicationAuthDeliveryProfile)
        .where(
          inArray(
            applicationAuthDeliveryProfile.applicationId,
            allowedApplicationIds
          )
        ),
      this.connection
        .select({
          id: applicationAuthProvider.id,
          applicationId: applicationAuthProvider.applicationId,
          provider: applicationAuthProvider.provider,
          enabled: applicationAuthProvider.enabled,
          encryptedClientId: applicationAuthProvider.encryptedClientId,
          secretKeyVersion: applicationAuthProvider.secretKeyVersion,
          scopesJson: applicationAuthProvider.scopesJson,
          updatedAt: applicationAuthProvider.updatedAt,
          updatedBy: applicationAuthProvider.updatedBy,
        })
        .from(applicationAuthProvider)
        .where(
          inArray(applicationAuthProvider.applicationId, allowedApplicationIds)
        )
        .orderBy(
          applicationAuthProvider.applicationId,
          applicationAuthProvider.provider
        ),
    ]);

    const originsByApplication = groupBy(origins, ({ applicationId }) => applicationId);
    const deliveryByApplication = new Map(
      deliveryProfiles.map((profile) => [profile.applicationId, profile])
    );
    const revisionByApplication = new Map(
      allowedConfigurations.map(({ configuration }) => [
        configuration.applicationId,
        configuration.revision,
      ])
    );
    const providersByApplication = groupBy(
      providers.map((provider) => {
        const providerName = parseApplicationAuthProviderName(provider.provider);
        this.keyring.assertVersionsAvailable([provider.secretKeyVersion]);
        if (
          this.keyring.getEnvelopeKeyVersion(provider.encryptedClientId) !==
          provider.secretKeyVersion
        ) {
          throw new Error("Application auth provider key version mismatch");
        }
        const clientId = this.keyring.decrypt(provider.encryptedClientId, {
          applicationId: provider.applicationId,
          model: "provider",
          provider: providerName,
          field: "clientId",
        });
        const scopes = applicationAuthProviderScopesSchema.parse(
          provider.scopesJson
        );
        assertApplicationSocialProviderScopes(providerName, scopes);
        return {
          applicationId: provider.applicationId,
          provider: providerName,
          configured: true as const,
          enabled: provider.enabled,
          maskedClientId: maskClientId(clientId),
          scopes: Object.freeze([...scopes]),
          revision: revisionByApplication.get(provider.applicationId) ?? 1,
          updatedAt: provider.updatedAt,
          updatedBy: provider.updatedBy,
        };
      }),
      ({ applicationId }) => applicationId
    );

    return allowedConfigurations.map(({ organizationId, configuration }) => ({
      organizationId,
      applicationId: configuration.applicationId,
      configuration,
      origins: Object.freeze([
        ...(originsByApplication.get(configuration.applicationId) ?? []),
      ]),
      deliveryProfile:
        deliveryByApplication.get(configuration.applicationId) ?? null,
      providers: Object.freeze([
        ...(providersByApplication.get(configuration.applicationId) ?? []),
      ]),
    }));
  }
}

function maskClientId(clientId: string): string {
  if (clientId.length <= 4) return `${clientId.slice(0, 1)}***`;
  if (clientId.length <= 10) {
    return `${clientId.slice(0, 2)}***${clientId.slice(-2)}`;
  }
  return `${clientId.slice(0, 4)}***${clientId.slice(-4)}`;
}

function groupBy<T>(
  values: readonly T[],
  key: (value: T) => string
): Map<string, T[]> {
  const result = new Map<string, T[]>();
  for (const value of values) {
    const groupKey = key(value);
    const group = result.get(groupKey);
    if (group) group.push(value);
    else result.set(groupKey, [value]);
  }
  return result;
}

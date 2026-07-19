import type { TransactionManager } from "@shopana/shared-kernel";
import { ReadOnly, Transactional } from "@shopana/shared-kernel";
import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  isNotNull,
  isNull,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { z } from "zod";
import type { Database } from "../infrastructure/db/database.js";
import {
  APPLICATION_OAUTH_GRANT_TYPES,
  APPLICATION_OAUTH_PROTOCOL_POLICY_VERSION,
  APPLICATION_OAUTH_RESPONSE_TYPES,
  APPLICATION_OAUTH_SCOPES,
  createApplicationOAuthClientPolicyMetadata,
  hasExactStringValues,
  readApplicationOAuthClientPolicyMetadata,
} from "../auth/applicationOAuthPolicy.js";
import { BaseRepository } from "./BaseRepository.js";
import {
  application,
  applicationAuthConfiguration,
  applicationOauthClient,
  organization,
} from "./models/index.js";

export interface ActiveApplicationOAuthClientPolicy {
  clientId: string;
  applicationId: string;
  resource: string;
  tokenEndpointAuthMethod:
    | "none"
    | "client_secret_basic"
    | "client_secret_post";
  public: boolean;
}

export interface ActiveApplicationOAuthHostedUiClient
  extends ActiveApplicationOAuthClientPolicy {
  name: string | null;
  icon: string | null;
  redirectUris: readonly string[];
  postLogoutRedirectUris: readonly string[];
  enableEndSession: boolean;
  scopes: readonly string[];
}

export interface ApplicationOAuthClientManagementScope {
  organizationId: string;
  applicationId: string;
  resource: string;
  realmEnabled: boolean;
}

export type ManagedApplicationOAuthClientType = "public" | "confidential";
export type ManagedApplicationOAuthClientEnvironment =
  | "development"
  | "production";

/** Secret-free representation used by the administrative domain service. */
export interface ManagedApplicationOAuthClient {
  id: string;
  applicationId: string;
  clientId: string;
  name: string;
  clientType: ManagedApplicationOAuthClientType;
  environment: ManagedApplicationOAuthClientEnvironment;
  redirectUris: readonly string[];
  postLogoutRedirectUris: readonly string[];
  resourceAudience: string;
  grantTypes: readonly string[];
  responseTypes: readonly string[];
  tokenEndpointAuthMethod: "none" | "client_secret_basic";
  requirePKCE: boolean;
  protocolPolicyVersion: number;
  skipConsent: boolean;
  enableEndSession: boolean;
  disabled: boolean;
  archived: boolean;
  revision: number;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
  createdBy: string;
  updatedBy: string;
}

export interface ManagedApplicationOAuthClientPage {
  clients: ManagedApplicationOAuthClient[];
  totalCount: number;
  offset: number;
  limit: number;
  hasNextPage: boolean;
}

export interface ListManagedApplicationOAuthClientsInput {
  applicationId: string;
  offset: number;
  limit: number;
  search?: string;
  clientTypes?: readonly ManagedApplicationOAuthClientType[];
  environments?: readonly ManagedApplicationOAuthClientEnvironment[];
  disabled?: boolean;
  archived?: boolean;
  orderBy?: "name" | "createdAt" | "updatedAt";
  orderDirection?: "asc" | "desc";
}

export interface CreateManagedApplicationOAuthClientInput {
  applicationId: string;
  resource: string;
  clientId: string;
  clientSecretHash: string | null;
  name: string;
  clientType: ManagedApplicationOAuthClientType;
  environment: ManagedApplicationOAuthClientEnvironment;
  redirectUris: readonly string[];
  postLogoutRedirectUris: readonly string[];
  skipConsent: boolean;
  enableEndSession: boolean;
  actorId: string;
}

export interface UpdateManagedApplicationOAuthClientInput {
  applicationId: string;
  clientId: string;
  expectedRevision: number;
  actorId: string;
  patch: {
    name?: string;
    environment?: ManagedApplicationOAuthClientEnvironment;
    redirectUris?: readonly string[];
    postLogoutRedirectUris?: readonly string[];
    enableEndSession?: boolean;
  };
}

const managedClientSelection = {
  id: applicationOauthClient.id,
  applicationId: applicationOauthClient.applicationId,
  clientId: applicationOauthClient.clientId,
  name: applicationOauthClient.name,
  public: applicationOauthClient.public,
  environment: applicationOauthClient.environment,
  redirectUris: applicationOauthClient.redirectUris,
  postLogoutRedirectUris: applicationOauthClient.postLogoutRedirectUris,
  resourceAudience: applicationOauthClient.resourceAudience,
  grantTypes: applicationOauthClient.grantTypes,
  responseTypes: applicationOauthClient.responseTypes,
  tokenEndpointAuthMethod: applicationOauthClient.tokenEndpointAuthMethod,
  requirePKCE: applicationOauthClient.requirePKCE,
  protocolPolicyVersion: applicationOauthClient.protocolPolicyVersion,
  skipConsent: applicationOauthClient.skipConsent,
  enableEndSession: applicationOauthClient.enableEndSession,
  disabled: applicationOauthClient.disabled,
  revision: applicationOauthClient.revision,
  createdAt: applicationOauthClient.createdAt,
  updatedAt: applicationOauthClient.updatedAt,
  deletedAt: applicationOauthClient.deletedAt,
  createdBy: applicationOauthClient.createdBy,
  updatedBy: applicationOauthClient.updatedBy,
} as const;

type ManagedClientRecord = {
  [K in keyof typeof managedClientSelection]:
    (typeof managedClientSelection)[K]["_"]["data"];
};

/**
 * Minimal read boundary used by the public OAuth resource guard.
 *
 * Secret material is deliberately not selected. Active realm, application,
 * organization and the immutable IAM-owned client protocol policy are checked
 * in the same read before a request may reach Better Auth.
 */
export class ApplicationOAuthClientRepository extends BaseRepository {
  constructor(db: Database, txManager: TransactionManager<Database>) {
    super(db, txManager);
  }

  @ReadOnly()
  async findActivePolicy(
    applicationId: string,
    clientId: string
  ): Promise<ActiveApplicationOAuthClientPolicy | null> {
    const applicationIdResult = z.string().uuid().safeParse(applicationId);
    const clientIdResult = z.string().min(1).max(512).safeParse(clientId);
    if (!applicationIdResult.success || !clientIdResult.success) return null;
    const validApplicationId = applicationIdResult.data;
    const validClientId = clientIdResult.data;
    const [record] = await this.connection
      .select({
        clientId: applicationOauthClient.clientId,
        applicationId: applicationOauthClient.applicationId,
        resourceAudience: applicationOauthClient.resourceAudience,
        tokenEndpointAuthMethod:
          applicationOauthClient.tokenEndpointAuthMethod,
        public: applicationOauthClient.public,
        protocolPolicyVersion:
          applicationOauthClient.protocolPolicyVersion,
        grantTypes: applicationOauthClient.grantTypes,
        responseTypes: applicationOauthClient.responseTypes,
        requirePKCE: applicationOauthClient.requirePKCE,
        metadata: applicationOauthClient.metadata,
        configuredResource: applicationAuthConfiguration.resource,
      })
      .from(applicationOauthClient)
      .innerJoin(
        applicationAuthConfiguration,
        eq(
          applicationAuthConfiguration.applicationId,
          applicationOauthClient.applicationId
        )
      )
      .innerJoin(
        application,
        eq(application.id, applicationOauthClient.applicationId)
      )
      .innerJoin(organization, eq(organization.id, application.organizationId))
      .where(
        and(
          eq(applicationOauthClient.applicationId, validApplicationId),
          eq(applicationOauthClient.clientId, validClientId),
          eq(applicationOauthClient.disabled, false),
          isNull(applicationOauthClient.deletedAt),
          eq(applicationAuthConfiguration.realmEnabled, true),
          isNull(application.deletedAt),
          isNull(organization.deletedAt)
        )
      )
      .limit(1);

    if (!record) return null;
    if (
      record.applicationId !== validApplicationId ||
      record.resourceAudience !== record.configuredResource ||
      record.protocolPolicyVersion !==
        APPLICATION_OAUTH_PROTOCOL_POLICY_VERSION ||
      !record.requirePKCE ||
      !hasExactStringValues(record.grantTypes, APPLICATION_OAUTH_GRANT_TYPES) ||
      !hasExactStringValues(
        record.responseTypes,
        APPLICATION_OAUTH_RESPONSE_TYPES
      )
    ) {
      return null;
    }

    const metadata = readApplicationOAuthClientPolicyMetadata(
      record.metadata ?? undefined,
      {
        applicationId: validApplicationId,
        resource: record.configuredResource,
      }
    );
    if (metadata.clientId !== validClientId) return null;
    if (
      record.tokenEndpointAuthMethod !== "none" &&
      record.tokenEndpointAuthMethod !== "client_secret_basic" &&
      record.tokenEndpointAuthMethod !== "client_secret_post"
    ) {
      return null;
    }

    return {
      clientId: record.clientId,
      applicationId: record.applicationId,
      resource: record.configuredResource,
      tokenEndpointAuthMethod: record.tokenEndpointAuthMethod,
      public: record.public,
    };
  }

  @ReadOnly()
  async findActiveHostedUiClient(
    applicationId: string,
    clientId: string
  ): Promise<ActiveApplicationOAuthHostedUiClient | null> {
    const policy = await this.findActivePolicy(applicationId, clientId);
    if (!policy) return null;
    const [client] = await this.connection
      .select({
        name: applicationOauthClient.name,
        icon: applicationOauthClient.icon,
        redirectUris: applicationOauthClient.redirectUris,
        postLogoutRedirectUris:
          applicationOauthClient.postLogoutRedirectUris,
        enableEndSession: applicationOauthClient.enableEndSession,
        scopes: applicationOauthClient.scopes,
      })
      .from(applicationOauthClient)
      .where(
        and(
          eq(applicationOauthClient.applicationId, applicationId),
          eq(applicationOauthClient.clientId, clientId),
          eq(applicationOauthClient.disabled, false),
          isNull(applicationOauthClient.deletedAt)
        )
      )
      .limit(1);
    if (!client) return null;
    return {
      ...policy,
      name: client.name,
      icon: client.icon,
      redirectUris: Object.freeze([...client.redirectUris]),
      postLogoutRedirectUris: Object.freeze([
        ...(client.postLogoutRedirectUris ?? []),
      ]),
      enableEndSession: client.enableEndSession,
      scopes: Object.freeze([...(client.scopes ?? [])]),
    };
  }

  @ReadOnly()
  async findManagementScope(
    organizationId: string,
    applicationId: string
  ): Promise<ApplicationOAuthClientManagementScope | null> {
    const organizationIdResult = z.string().uuid().safeParse(organizationId);
    const applicationIdResult = z.string().uuid().safeParse(applicationId);
    if (!organizationIdResult.success || !applicationIdResult.success) {
      return null;
    }

    const [record] = await this.connection
      .select({
        organizationId: application.organizationId,
        applicationId: application.id,
        resource: applicationAuthConfiguration.resource,
        realmEnabled: applicationAuthConfiguration.realmEnabled,
      })
      .from(application)
      .innerJoin(organization, eq(organization.id, application.organizationId))
      .innerJoin(
        applicationAuthConfiguration,
        eq(applicationAuthConfiguration.applicationId, application.id)
      )
      .where(
        and(
          eq(application.organizationId, organizationIdResult.data),
          eq(application.id, applicationIdResult.data),
          isNull(application.deletedAt),
          isNull(organization.deletedAt)
        )
      )
      .limit(1);

    return record ?? null;
  }

  @ReadOnly()
  async findManaged(
    applicationId: string,
    clientId: string,
    options: { includeArchived?: boolean } = {}
  ): Promise<ManagedApplicationOAuthClient | null> {
    const conditions: SQL[] = [
      eq(applicationOauthClient.applicationId, applicationId),
      eq(applicationOauthClient.clientId, clientId),
    ];
    if (!options.includeArchived) {
      conditions.push(isNull(applicationOauthClient.deletedAt));
    }
    const [record] = await this.connection
      .select(managedClientSelection)
      .from(applicationOauthClient)
      .where(and(...conditions))
      .limit(1);
    return record ? mapManagedClient(record as ManagedClientRecord) : null;
  }

  @ReadOnly()
  async listManaged(
    input: ListManagedApplicationOAuthClientsInput
  ): Promise<ManagedApplicationOAuthClientPage> {
    const conditions: SQL[] = [
      eq(applicationOauthClient.applicationId, input.applicationId),
    ];
    if (input.search) {
      const search = `%${input.search}%`;
      const condition = or(
        ilike(applicationOauthClient.name, search),
        ilike(applicationOauthClient.clientId, search)
      );
      if (condition) conditions.push(condition);
    }
    if (input.clientTypes?.length === 1) {
      conditions.push(
        eq(applicationOauthClient.public, input.clientTypes[0] === "public")
      );
    }
    if (input.environments?.length) {
      conditions.push(
        inArray(applicationOauthClient.environment, [...input.environments])
      );
    }
    if (input.disabled !== undefined) {
      conditions.push(eq(applicationOauthClient.disabled, input.disabled));
    }
    if (input.archived === true) {
      conditions.push(isNotNull(applicationOauthClient.deletedAt));
    } else {
      conditions.push(isNull(applicationOauthClient.deletedAt));
    }

    const where = and(...conditions);
    const direction = input.orderDirection === "asc" ? asc : desc;
    const orderColumn =
      input.orderBy === "name"
        ? applicationOauthClient.name
        : input.orderBy === "createdAt"
          ? applicationOauthClient.createdAt
          : applicationOauthClient.updatedAt;
    const [records, totals] = await Promise.all([
      this.connection
        .select(managedClientSelection)
        .from(applicationOauthClient)
        .where(where)
        .orderBy(
          direction(orderColumn),
          direction(applicationOauthClient.clientId)
        )
        .limit(input.limit)
        .offset(input.offset),
      this.connection
        .select({ value: count() })
        .from(applicationOauthClient)
        .where(where),
    ]);
    const totalCount = totals[0]?.value ?? 0;
    return {
      clients: records.map((record) =>
        mapManagedClient(record as ManagedClientRecord)
      ),
      totalCount,
      offset: input.offset,
      limit: input.limit,
      hasNextPage: input.offset + records.length < totalCount,
    };
  }

  @Transactional()
  async createManaged(
    input: CreateManagedApplicationOAuthClientInput
  ): Promise<ManagedApplicationOAuthClient> {
    const id = await this.generateUuidV7();
    const isPublic = input.clientType === "public";
    const [created] = await this.connection
      .insert(applicationOauthClient)
      .values({
        id,
        applicationId: input.applicationId,
        clientId: input.clientId,
        clientSecret: input.clientSecretHash,
        disabled: false,
        skipConsent: input.skipConsent,
        enableEndSession: input.enableEndSession,
        scopes: [...APPLICATION_OAUTH_SCOPES],
        userId: null,
        name: input.name,
        redirectUris: [...input.redirectUris],
        postLogoutRedirectUris: [...input.postLogoutRedirectUris],
        tokenEndpointAuthMethod: isPublic ? "none" : "client_secret_basic",
        grantTypes: [...APPLICATION_OAUTH_GRANT_TYPES],
        responseTypes: [...APPLICATION_OAUTH_RESPONSE_TYPES],
        public: isPublic,
        type: isPublic ? "native" : "web",
        requirePKCE: true,
        referenceId: input.applicationId,
        metadata: createApplicationOAuthClientPolicyMetadata({
          applicationId: input.applicationId,
          clientId: input.clientId,
          resource: input.resource,
        }),
        resourceAudience: input.resource,
        protocolPolicyVersion: APPLICATION_OAUTH_PROTOCOL_POLICY_VERSION,
        environment: input.environment,
        createdBy: input.actorId,
        updatedBy: input.actorId,
      })
      .returning(managedClientSelection);
    if (!created) {
      throw new Error("OAuth client could not be created");
    }
    return mapManagedClient(created as ManagedClientRecord);
  }

  @Transactional()
  async updateManaged(
    input: UpdateManagedApplicationOAuthClientInput
  ): Promise<ManagedApplicationOAuthClient | null> {
    const patch = input.patch;
    const [updated] = await this.connection
      .update(applicationOauthClient)
      .set({
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.environment !== undefined
          ? { environment: patch.environment }
          : {}),
        ...(patch.redirectUris !== undefined
          ? { redirectUris: [...patch.redirectUris] }
          : {}),
        ...(patch.postLogoutRedirectUris !== undefined
          ? { postLogoutRedirectUris: [...patch.postLogoutRedirectUris] }
          : {}),
        ...(patch.enableEndSession !== undefined
          ? { enableEndSession: patch.enableEndSession }
          : {}),
        updatedBy: input.actorId,
        updatedAt: new Date(),
        revision: sql`${applicationOauthClient.revision} + 1`,
      })
      .where(
        and(
          eq(applicationOauthClient.applicationId, input.applicationId),
          eq(applicationOauthClient.clientId, input.clientId),
          eq(applicationOauthClient.revision, input.expectedRevision),
          isNull(applicationOauthClient.deletedAt)
        )
      )
      .returning(managedClientSelection);
    return updated ? mapManagedClient(updated as ManagedClientRecord) : null;
  }

  @Transactional()
  async setManagedEnabled(input: {
    applicationId: string;
    clientId: string;
    enabled: boolean;
    expectedRevision: number;
    actorId: string;
  }): Promise<ManagedApplicationOAuthClient | null> {
    const [updated] = await this.connection
      .update(applicationOauthClient)
      .set({
        disabled: !input.enabled,
        updatedBy: input.actorId,
        updatedAt: new Date(),
        revision: sql`${applicationOauthClient.revision} + 1`,
      })
      .where(
        and(
          eq(applicationOauthClient.applicationId, input.applicationId),
          eq(applicationOauthClient.clientId, input.clientId),
          eq(applicationOauthClient.revision, input.expectedRevision),
          isNull(applicationOauthClient.deletedAt)
        )
      )
      .returning(managedClientSelection);
    return updated ? mapManagedClient(updated as ManagedClientRecord) : null;
  }

  @Transactional()
  async setManagedSkipConsent(input: {
    applicationId: string;
    clientId: string;
    skipConsent: boolean;
    expectedRevision: number;
    actorId: string;
  }): Promise<ManagedApplicationOAuthClient | null> {
    const [updated] = await this.connection
      .update(applicationOauthClient)
      .set({
        skipConsent: input.skipConsent,
        updatedBy: input.actorId,
        updatedAt: new Date(),
        revision: sql`${applicationOauthClient.revision} + 1`,
      })
      .where(
        and(
          eq(applicationOauthClient.applicationId, input.applicationId),
          eq(applicationOauthClient.clientId, input.clientId),
          eq(applicationOauthClient.revision, input.expectedRevision),
          isNull(applicationOauthClient.deletedAt)
        )
      )
      .returning(managedClientSelection);
    return updated ? mapManagedClient(updated as ManagedClientRecord) : null;
  }

  @Transactional()
  async rotateManagedSecret(input: {
    applicationId: string;
    clientId: string;
    clientSecretHash: string;
    expectedRevision: number;
    actorId: string;
  }): Promise<ManagedApplicationOAuthClient | null> {
    const [updated] = await this.connection
      .update(applicationOauthClient)
      .set({
        clientSecret: input.clientSecretHash,
        updatedBy: input.actorId,
        updatedAt: new Date(),
        revision: sql`${applicationOauthClient.revision} + 1`,
      })
      .where(
        and(
          eq(applicationOauthClient.applicationId, input.applicationId),
          eq(applicationOauthClient.clientId, input.clientId),
          eq(applicationOauthClient.revision, input.expectedRevision),
          eq(applicationOauthClient.public, false),
          isNull(applicationOauthClient.deletedAt)
        )
      )
      .returning(managedClientSelection);
    return updated ? mapManagedClient(updated as ManagedClientRecord) : null;
  }

  @Transactional()
  async archiveManaged(input: {
    applicationId: string;
    clientId: string;
    expectedRevision: number;
    actorId: string;
  }): Promise<ManagedApplicationOAuthClient | null> {
    const now = new Date();
    const [updated] = await this.connection
      .update(applicationOauthClient)
      .set({
        disabled: true,
        deletedAt: now,
        updatedBy: input.actorId,
        updatedAt: now,
        revision: sql`${applicationOauthClient.revision} + 1`,
      })
      .where(
        and(
          eq(applicationOauthClient.applicationId, input.applicationId),
          eq(applicationOauthClient.clientId, input.clientId),
          eq(applicationOauthClient.revision, input.expectedRevision),
          isNull(applicationOauthClient.deletedAt)
        )
      )
      .returning(managedClientSelection);
    return updated ? mapManagedClient(updated as ManagedClientRecord) : null;
  }
}

function mapManagedClient(
  record: ManagedClientRecord
): ManagedApplicationOAuthClient {
  if (!record.name) {
    throw new Error("Managed OAuth client name is missing");
  }
  const expectedAuthMethod = record.public
    ? "none"
    : "client_secret_basic";
  if (record.tokenEndpointAuthMethod !== expectedAuthMethod) {
    throw new Error("Managed OAuth client auth method violates policy");
  }
  return {
    id: record.id,
    applicationId: record.applicationId,
    clientId: record.clientId,
    name: record.name,
    clientType: record.public ? "public" : "confidential",
    environment: record.environment,
    redirectUris: Object.freeze([...record.redirectUris]),
    postLogoutRedirectUris: Object.freeze([
      ...(record.postLogoutRedirectUris ?? []),
    ]),
    resourceAudience: record.resourceAudience,
    grantTypes: Object.freeze([...record.grantTypes]),
    responseTypes: Object.freeze([...record.responseTypes]),
    tokenEndpointAuthMethod: expectedAuthMethod,
    requirePKCE: record.requirePKCE,
    protocolPolicyVersion: record.protocolPolicyVersion,
    skipConsent: record.skipConsent,
    enableEndSession: record.enableEndSession,
    disabled: record.disabled,
    archived: record.deletedAt !== null,
    revision: record.revision,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    archivedAt: record.deletedAt,
    createdBy: record.createdBy,
    updatedBy: record.updatedBy,
  };
}

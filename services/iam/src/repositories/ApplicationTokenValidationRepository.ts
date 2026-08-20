import type { TransactionManager } from "@shopana/shared-kernel";
import { ReadOnly, Transactional } from "@shopana/shared-kernel";
import { and, eq, gt, isNull } from "drizzle-orm";
import type { Database } from "../infrastructure/db/database.js";
import { assertApplicationId } from "../auth/AuthScope.js";
import {
  APPLICATION_OAUTH_GRANT_TYPES,
  APPLICATION_OAUTH_PROTOCOL_POLICY_VERSION,
  APPLICATION_OAUTH_RESPONSE_TYPES,
  hasExactStringValues,
} from "../auth/applicationOAuthPolicy.js";
import {
  application,
  applicationAuthConfiguration,
  applicationJwks,
  applicationOauthClient,
  applicationOauthRefreshToken,
  applicationSession,
  applicationUser,
  organization,
} from "./models/index.js";
import { BaseRepository } from "./BaseRepository.js";

export interface ApplicationTokenSigningKeyRecord {
  id: string;
  publicKey: string;
}

export interface ApplicationTokenLiveStateRecord {
  applicationExists: boolean;
  realmEnabled: boolean;
  resource: string | null;
  applicationDeleted: boolean;
  organizationDeleted: boolean;
  clientExists: boolean;
  clientActive: boolean;
  clientResource: string | null;
  userExists: boolean;
  userActive: boolean;
  sessionExists: boolean;
  sessionExpiresAt: Date | null;
  tokenFamilyActive: boolean;
}

export interface ApplicationRefreshTokenRecord {
  id: string;
  applicationId: string;
  clientId: string;
  userId: string;
  sessionId: string | null;
  referenceId: string | null;
  scopes: string[];
  createdAt: Date;
  expiresAt: Date;
  revoked: Date | null;
}

export interface ApplicationTokenLiveStateInput {
  applicationId: string;
  audience: string;
  clientId: string;
  userId: string;
  sessionId: string;
  tokenFamilyId?: string;
  now: Date;
}

/** Read/write boundary for the application OAuth live-state contract. */
export class ApplicationTokenValidationRepository extends BaseRepository {
  constructor(db: Database, txManager: TransactionManager<Database>) {
    super(db, txManager);
  }

  @ReadOnly()
  async findSigningKey(
    applicationId: string,
    keyId: string,
  ): Promise<ApplicationTokenSigningKeyRecord | null> {
    assertApplicationId(applicationId);
    if (!keyId || keyId.length > 512) return null;
    const [record] = await this.connection
      .select({ id: applicationJwks.id, publicKey: applicationJwks.publicKey })
      .from(applicationJwks)
      .where(and(eq(applicationJwks.applicationId, applicationId), eq(applicationJwks.id, keyId)))
      .limit(1);
    return record ?? null;
  }

  @ReadOnly()
  async readLiveState(
    input: ApplicationTokenLiveStateInput,
  ): Promise<ApplicationTokenLiveStateRecord> {
    assertApplicationId(input.applicationId);
    const [record] = await this.connection
      .select({
        configurationApplicationId: applicationAuthConfiguration.applicationId,
        realmEnabled: applicationAuthConfiguration.realmEnabled,
        resource: applicationAuthConfiguration.resource,
        applicationId: application.id,
        applicationDeletedAt: application.deletedAt,
        organizationId: organization.id,
        organizationDeletedAt: organization.deletedAt,
        clientId: applicationOauthClient.clientId,
        clientDisabled: applicationOauthClient.disabled,
        clientDeletedAt: applicationOauthClient.deletedAt,
        clientResource: applicationOauthClient.resourceAudience,
        clientProtocolPolicyVersion: applicationOauthClient.protocolPolicyVersion,
        clientGrantTypes: applicationOauthClient.grantTypes,
        clientResponseTypes: applicationOauthClient.responseTypes,
        clientRequirePKCE: applicationOauthClient.requirePKCE,
        userId: applicationUser.id,
        userStatus: applicationUser.status,
        sessionId: applicationSession.id,
        sessionExpiresAt: applicationSession.expiresAt,
        tokenFamilyId: applicationOauthRefreshToken.id,
      })
      .from(applicationAuthConfiguration)
      .innerJoin(application, eq(application.id, applicationAuthConfiguration.applicationId))
      .innerJoin(organization, eq(organization.id, application.organizationId))
      .leftJoin(
        applicationOauthClient,
        and(
          eq(applicationOauthClient.applicationId, applicationAuthConfiguration.applicationId),
          eq(applicationOauthClient.clientId, input.clientId),
        ),
      )
      .leftJoin(
        applicationUser,
        and(
          eq(applicationUser.applicationId, applicationAuthConfiguration.applicationId),
          eq(applicationUser.id, input.userId),
        ),
      )
      .leftJoin(
        applicationSession,
        and(
          eq(applicationSession.applicationId, applicationAuthConfiguration.applicationId),
          eq(applicationSession.id, input.sessionId),
          eq(applicationSession.userId, input.userId),
        ),
      )
      .leftJoin(
        applicationOauthRefreshToken,
        and(
          eq(
            applicationOauthRefreshToken.applicationId,
            applicationAuthConfiguration.applicationId,
          ),
          eq(applicationOauthRefreshToken.clientId, input.clientId),
          eq(applicationOauthRefreshToken.userId, input.userId),
          eq(applicationOauthRefreshToken.sessionId, input.sessionId),
          input.tokenFamilyId
            ? eq(applicationOauthRefreshToken.referenceId, input.tokenFamilyId)
            : eq(applicationOauthRefreshToken.id, ""),
          isNull(applicationOauthRefreshToken.revoked),
          gt(applicationOauthRefreshToken.expiresAt, input.now),
        ),
      )
      .where(eq(applicationAuthConfiguration.applicationId, input.applicationId))
      .limit(1);

    if (!record) {
      return missingApplicationState();
    }
    return {
      applicationExists:
        record.configurationApplicationId === input.applicationId &&
        record.applicationId === input.applicationId &&
        Boolean(record.organizationId),
      realmEnabled: record.realmEnabled,
      resource: record.resource,
      applicationDeleted: record.applicationDeletedAt !== null,
      organizationDeleted: record.organizationDeletedAt !== null,
      clientExists: record.clientId === input.clientId,
      clientActive:
        record.clientId === input.clientId &&
        record.clientDisabled === false &&
        record.clientDeletedAt === null &&
        record.clientProtocolPolicyVersion === APPLICATION_OAUTH_PROTOCOL_POLICY_VERSION &&
        record.clientRequirePKCE === true &&
        hasExactStringValues(record.clientGrantTypes ?? [], APPLICATION_OAUTH_GRANT_TYPES) &&
        hasExactStringValues(record.clientResponseTypes ?? [], APPLICATION_OAUTH_RESPONSE_TYPES),
      clientResource: record.clientResource,
      userExists: record.userId === input.userId,
      userActive: record.userId === input.userId && record.userStatus === "active",
      sessionExists: record.sessionId === input.sessionId,
      sessionExpiresAt: record.sessionExpiresAt,
      tokenFamilyActive: input.tokenFamilyId === undefined || record.tokenFamilyId !== null,
    };
  }

  @ReadOnly()
  async findRefreshTokenByHash(
    applicationId: string,
    tokenHash: string,
  ): Promise<ApplicationRefreshTokenRecord | null> {
    assertApplicationId(applicationId);
    if (!tokenHash || tokenHash.length > 512) return null;
    const [record] = await this.connection
      .select({
        id: applicationOauthRefreshToken.id,
        applicationId: applicationOauthRefreshToken.applicationId,
        clientId: applicationOauthRefreshToken.clientId,
        userId: applicationOauthRefreshToken.userId,
        sessionId: applicationOauthRefreshToken.sessionId,
        referenceId: applicationOauthRefreshToken.referenceId,
        scopes: applicationOauthRefreshToken.scopes,
        createdAt: applicationOauthRefreshToken.createdAt,
        expiresAt: applicationOauthRefreshToken.expiresAt,
        revoked: applicationOauthRefreshToken.revoked,
      })
      .from(applicationOauthRefreshToken)
      .where(
        and(
          eq(applicationOauthRefreshToken.applicationId, applicationId),
          eq(applicationOauthRefreshToken.token, tokenHash),
        ),
      )
      .limit(1);
    return record ?? null;
  }

  @Transactional()
  async revokeTokenFamily(input: {
    applicationId: string;
    clientId: string;
    userId: string;
    sessionId: string;
    tokenFamilyId: string;
    revokedAt: Date;
  }): Promise<number> {
    assertApplicationId(input.applicationId);
    const rows = await this.connection
      .update(applicationOauthRefreshToken)
      .set({ revoked: input.revokedAt })
      .where(
        and(
          eq(applicationOauthRefreshToken.applicationId, input.applicationId),
          eq(applicationOauthRefreshToken.clientId, input.clientId),
          eq(applicationOauthRefreshToken.userId, input.userId),
          eq(applicationOauthRefreshToken.sessionId, input.sessionId),
          eq(applicationOauthRefreshToken.referenceId, input.tokenFamilyId),
          isNull(applicationOauthRefreshToken.revoked),
        ),
      )
      .returning({ id: applicationOauthRefreshToken.id });
    return rows.length;
  }

  @Transactional()
  async revokeSession(input: {
    applicationId: string;
    userId: string;
    sessionId: string;
    revokedAt: Date;
  }): Promise<boolean> {
    assertApplicationId(input.applicationId);
    await this.connection
      .update(applicationOauthRefreshToken)
      .set({ revoked: input.revokedAt, sessionId: null })
      .where(
        and(
          eq(applicationOauthRefreshToken.applicationId, input.applicationId),
          eq(applicationOauthRefreshToken.userId, input.userId),
          eq(applicationOauthRefreshToken.sessionId, input.sessionId),
        ),
      );
    const rows = await this.connection
      .delete(applicationSession)
      .where(
        and(
          eq(applicationSession.applicationId, input.applicationId),
          eq(applicationSession.userId, input.userId),
          eq(applicationSession.id, input.sessionId),
        ),
      )
      .returning({ id: applicationSession.id });
    return rows.length === 1;
  }
}

function missingApplicationState(): ApplicationTokenLiveStateRecord {
  return {
    applicationExists: false,
    realmEnabled: false,
    resource: null,
    applicationDeleted: true,
    organizationDeleted: true,
    clientExists: false,
    clientActive: false,
    clientResource: null,
    userExists: false,
    userActive: false,
    sessionExists: false,
    sessionExpiresAt: null,
    tokenFamilyActive: false,
  };
}

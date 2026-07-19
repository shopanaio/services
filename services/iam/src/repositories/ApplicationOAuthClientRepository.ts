import type { TransactionManager } from "@shopana/shared-kernel";
import { ReadOnly } from "@shopana/shared-kernel";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import type { Database } from "../infrastructure/db/database.js";
import {
  APPLICATION_OAUTH_GRANT_TYPES,
  APPLICATION_OAUTH_PROTOCOL_POLICY_VERSION,
  APPLICATION_OAUTH_RESPONSE_TYPES,
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
}

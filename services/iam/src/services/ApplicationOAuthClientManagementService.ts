import { randomUUID } from "node:crypto";
import { KernelError } from "@shopana/shared-kernel";
import type { AuthProvider } from "@shopana/rbac";
import { z, ZodError } from "zod";
import {
  APPLICATION_OAUTH_GRANT_TYPES,
  APPLICATION_OAUTH_PROTOCOL_POLICY_VERSION,
  APPLICATION_OAUTH_RESPONSE_TYPES,
} from "../auth/applicationOAuthPolicy.js";
import { createApplicationResource } from "../auth/applicationAuthConfiguration.js";
import type {
  ApplicationOAuthClientManagementScope,
  ApplicationOAuthClientRepository,
  ManagedApplicationOAuthClient,
  ManagedApplicationOAuthClientEnvironment,
  ManagedApplicationOAuthClientType,
  ManagedApplicationOAuthClientConnectionInput,
} from "../repositories/ApplicationOAuthClientRepository.js";
import type { PageInfo } from "@shopana/drizzle-query";
import type {
  ApplicationAuthAdminAuditAction,
  ApplicationAuthAdminAuditPort,
  ApplicationAuthAdminAuditReasonCategory,
  ApplicationOAuthClientAdminAuditSafeDiff,
} from "./ApplicationAuthAdminAuditPort.js";
import { OAuthClientSecretCodec } from "./OAuthClientSecretCodec.js";

const OAUTH_CLIENT_RESOURCE = "org.application-oauth-clients";
const MAX_URI_COUNT = 20;
const MAX_URI_LENGTH = 2048;

export interface ApplicationOAuthClientAdminActor {
  /** Stable platform Better Auth user ID from trusted request context. */
  id: string;
  requestId: string;
}

export interface ApplicationOAuthClient {
  id: string;
  organizationId: string;
  applicationId: string;
  clientId: string;
  name: string;
  clientType: ManagedApplicationOAuthClientType;
  environment: ManagedApplicationOAuthClientEnvironment;
  redirectUris: readonly string[];
  postLogoutRedirectUris: readonly string[];
  resources: readonly [string];
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

export interface OAuthClientPage {
  clients: ApplicationOAuthClient[];
  totalCount: number;
  offset: number;
  limit: number;
  hasNextPage: boolean;
}

export interface OAuthClientConnection {
  edges: Array<{ cursor: string; client: ApplicationOAuthClient }>;
  pageInfo: PageInfo;
  totalCount: number;
}

export type ListOAuthClientsConnectionInput = Omit<
  ManagedApplicationOAuthClientConnectionInput,
  "applicationId"
> & {
  organizationId: string;
  applicationId: string;
};

export interface ListOAuthClientsInput {
  organizationId: string;
  applicationId: string;
  offset?: number;
  limit?: number;
  where?: {
    search?: string;
    clientTypes?: readonly ManagedApplicationOAuthClientType[];
    environments?: readonly ManagedApplicationOAuthClientEnvironment[];
    disabled?: boolean;
    archived?: boolean;
  };
  orderBy?: {
    field: "name" | "createdAt" | "updatedAt";
    direction: "asc" | "desc";
  };
}

export interface GetOAuthClientInput {
  organizationId: string;
  applicationId: string;
  clientId: string;
}

export interface CreateOAuthClientInput {
  organizationId: string;
  applicationId: string;
  name: string;
  clientType: ManagedApplicationOAuthClientType;
  environment: ManagedApplicationOAuthClientEnvironment;
  redirectUris: readonly string[];
  postLogoutRedirectUris?: readonly string[];
  skipConsent?: boolean;
  enableEndSession?: boolean;
}

export interface CreateOAuthClientResult {
  client: ApplicationOAuthClient;
  /** Plaintext is returned once and is never persisted or audited. */
  clientSecret: string | null;
}

export interface UpdateOAuthClientInput {
  organizationId: string;
  applicationId: string;
  clientId: string;
  name?: string;
  environment?: ManagedApplicationOAuthClientEnvironment;
  redirectUris?: readonly string[];
  postLogoutRedirectUris?: readonly string[];
  enableEndSession?: boolean;
  expectedRevision: number;
}

export interface SetOAuthClientEnabledInput {
  organizationId: string;
  applicationId: string;
  clientId: string;
  enabled: boolean;
  expectedRevision: number;
}

export interface SetOAuthClientSkipConsentInput {
  organizationId: string;
  applicationId: string;
  clientId: string;
  skipConsent: boolean;
  expectedRevision: number;
}

export interface RotateOAuthClientSecretInput {
  organizationId: string;
  applicationId: string;
  clientId: string;
  expectedRevision: number;
}

export interface RotateSecretResult {
  client: ApplicationOAuthClient;
  /** Plaintext replacement returned exactly once. */
  clientSecret: string;
}

export interface ArchiveOAuthClientInput {
  organizationId: string;
  applicationId: string;
  clientId: string;
  expectedRevision: number;
}

export interface ApplicationOAuthClientTransactionRunner {
  run<TResult>(callback: () => Promise<TResult>): Promise<TResult>;
}

export interface ApplicationOAuthClientCacheInvalidator {
  /** Implementations must absorb transport failures after local invalidation. */
  invalidate(applicationId: string, clientId: string): void | Promise<void>;
}

export interface ApplicationOAuthClientFirstPartyPolicy {
  isConfirmedFirstParty(input: {
    actorId: string;
    organizationId: string;
    applicationId: string;
    clientId: string;
  }): Promise<boolean>;
}

export interface ApplicationOAuthClientManagementOptions {
  allowedMobileSchemes?: readonly string[];
  firstPartyPolicy?: ApplicationOAuthClientFirstPartyPolicy;
  now?: () => Date;
}

type ManagementErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "APPLICATION_NOT_FOUND"
  | "APPLICATION_AUTH_CONFIGURATION_INVALID"
  | "OAUTH_CLIENT_NOT_FOUND"
  | "INVALID_INPUT"
  | "INVALID_REDIRECT_URI"
  | "INVALID_POST_LOGOUT_REDIRECT_URI"
  | "FIRST_PARTY_CLIENT_REQUIRED"
  | "OAUTH_CLIENT_ARCHIVED"
  | "OAUTH_CLIENT_DISABLED"
  | "PUBLIC_CLIENT_SECRET_ROTATION_FORBIDDEN"
  | "OAUTH_CLIENT_REVISION_CONFLICT"
  | "ADMIN_AUDIT_UNAVAILABLE"
  | "OAUTH_CLIENT_INTERNAL_ERROR";

export class ApplicationOAuthClientManagementError extends KernelError {
  declare readonly code: ManagementErrorCode;

  constructor(message: string, code: ManagementErrorCode, details?: unknown) {
    super(message, code, details);
    this.name = "ApplicationOAuthClientManagementError";
  }
}

const actorSchema = z
  .object({
    id: z.string().min(1).max(128),
    requestId: z.string().min(1).max(256),
  })
  .strict();

const scopeSchema = z
  .object({
    organizationId: z.string().uuid(),
    applicationId: z.string().uuid(),
  })
  .strict();

const clientIdSchema = z.string().min(1).max(512);
const revisionSchema = z.number().int().positive();
const environmentSchema = z.enum(["development", "production"]);
const clientTypeSchema = z.enum(["public", "confidential"]);
const uriSchema = z.string().min(1).max(MAX_URI_LENGTH);
const uriListSchema = z.array(uriSchema).max(MAX_URI_COUNT);

const listSchema = scopeSchema
  .extend({
    offset: z.number().int().min(0).default(0),
    limit: z.number().int().min(1).max(100).default(50),
    where: z
      .object({
        search: z.string().trim().min(1).max(256).optional(),
        clientTypes: z.array(clientTypeSchema).max(2).optional(),
        environments: z.array(environmentSchema).max(2).optional(),
        disabled: z.boolean().optional(),
        archived: z.boolean().optional(),
      })
      .strict()
      .optional(),
    orderBy: z
      .object({
        field: z.enum(["name", "createdAt", "updatedAt"]),
        direction: z.enum(["asc", "desc"]),
      })
      .strict()
      .optional(),
  })
  .strict();

const getSchema = scopeSchema
  .extend({
    clientId: clientIdSchema,
  })
  .strict();

const createSchema = scopeSchema
  .extend({
    name: z.string().trim().min(1).max(256),
    clientType: clientTypeSchema,
    environment: environmentSchema,
    redirectUris: uriListSchema.min(1),
    postLogoutRedirectUris: uriListSchema.optional().default([]),
    skipConsent: z.boolean().optional().default(false),
    enableEndSession: z.boolean().optional().default(true),
  })
  .strict();

const updateSchema = getSchema
  .extend({
    name: z.string().trim().min(1).max(256).optional(),
    environment: environmentSchema.optional(),
    redirectUris: uriListSchema.min(1).optional(),
    postLogoutRedirectUris: uriListSchema.optional(),
    enableEndSession: z.boolean().optional(),
    expectedRevision: revisionSchema,
  })
  .strict()
  .refine(
    (input) =>
      input.name !== undefined ||
      input.environment !== undefined ||
      input.redirectUris !== undefined ||
      input.postLogoutRedirectUris !== undefined ||
      input.enableEndSession !== undefined,
    { message: "At least one mutable OAuth client field is required" }
  );

const enabledSchema = getSchema
  .extend({
    enabled: z.boolean(),
    expectedRevision: revisionSchema,
  })
  .strict();

const skipConsentSchema = getSchema
  .extend({
    skipConsent: z.boolean(),
    expectedRevision: revisionSchema,
  })
  .strict();

const revisionedClientSchema = getSchema
  .extend({ expectedRevision: revisionSchema })
  .strict();

interface WriteExecution<TResult> {
  result: TResult;
  targetId: string;
  safeDiff: ApplicationOAuthClientAdminAuditSafeDiff;
}

interface ExecuteWriteInput<TResult> {
  actor: ApplicationOAuthClientAdminActor;
  organizationId: string;
  applicationId: string;
  targetId?: string;
  permission: "write" | "admin";
  auditAction: ApplicationAuthAdminAuditAction;
  failureSafeDiff: ApplicationOAuthClientAdminAuditSafeDiff;
  execute(
    scope: ApplicationOAuthClientManagementScope,
    actor: ApplicationOAuthClientAdminActor
  ): Promise<WriteExecution<TResult>>;
}

const denyFirstPartyPolicy: ApplicationOAuthClientFirstPartyPolicy = {
  async isConfirmedFirstParty() {
    return false;
  },
};

/**
 * Trusted administrative boundary for application-scoped OAuth clients.
 *
 * The service accepts only a platform actor supplied by the Admin GraphQL
 * context. It never accepts an application user session, resource audience,
 * grant type, response type, token auth method, or secret hash from callers.
 */
export class ApplicationOAuthClientManagementService {
  private readonly allowedMobileSchemes: ReadonlySet<string>;
  private readonly firstPartyPolicy: ApplicationOAuthClientFirstPartyPolicy;
  private readonly now: () => Date;

  constructor(
    private readonly clients: ApplicationOAuthClientRepository,
    private readonly transactions: ApplicationOAuthClientTransactionRunner,
    private readonly authorizer: AuthProvider,
    private readonly audit: ApplicationAuthAdminAuditPort,
    private readonly invalidation: ApplicationOAuthClientCacheInvalidator,
    private readonly secretCodec = new OAuthClientSecretCodec(),
    options: ApplicationOAuthClientManagementOptions = {}
  ) {
    this.allowedMobileSchemes = new Set(
      (options.allowedMobileSchemes ?? []).map(normalizeMobileScheme)
    );
    this.firstPartyPolicy =
      options.firstPartyPolicy ?? denyFirstPartyPolicy;
    this.now = options.now ?? (() => new Date());
  }

  async list(
    input: ListOAuthClientsInput,
    actor: ApplicationOAuthClientAdminActor
  ): Promise<OAuthClientPage> {
    const value = this.parse(listSchema, input);
    const trustedActor = this.parseActor(actor);
    await this.assertAuthorized(value.organizationId, trustedActor, "read");
    const scope = await this.requireScope(
      value.organizationId,
      value.applicationId
    );
    const page = await this.clients.listManaged({
      applicationId: scope.applicationId,
      offset: value.offset,
      limit: value.limit,
      search: value.where?.search,
      clientTypes: unique(value.where?.clientTypes),
      environments: unique(value.where?.environments),
      disabled: value.where?.disabled,
      archived: value.where?.archived,
      orderBy: value.orderBy?.field,
      orderDirection: value.orderBy?.direction,
    });
    return {
      ...page,
      clients: page.clients.map((client) => this.project(scope, client)),
    };
  }

  async get(
    input: GetOAuthClientInput,
    actor: ApplicationOAuthClientAdminActor
  ): Promise<ApplicationOAuthClient> {
    const value = this.parse(getSchema, input);
    const trustedActor = this.parseActor(actor);
    await this.assertAuthorized(value.organizationId, trustedActor, "read");
    const scope = await this.requireScope(
      value.organizationId,
      value.applicationId
    );
    const client = await this.requireClient(scope, value.clientId, true);
    return this.project(scope, client);
  }

  async getConnection(
    input: ListOAuthClientsConnectionInput,
    actor: ApplicationOAuthClientAdminActor
  ): Promise<OAuthClientConnection> {
    const scopeInput = this.parse(scopeSchema, {
      organizationId: input.organizationId,
      applicationId: input.applicationId,
    });
    const trustedActor = this.parseActor(actor);
    await this.assertAuthorized(
      scopeInput.organizationId,
      trustedActor,
      "read"
    );
    const scope = await this.requireScope(
      scopeInput.organizationId,
      scopeInput.applicationId
    );
    const { organizationId: _organizationId, ...relayInput } = input;
    const result = await this.clients.getManagedConnection({
      ...relayInput,
      applicationId: scope.applicationId,
    });
    return {
      edges: result.edges.map(({ cursor, client }) => {
        this.assertProtocolPolicy(scope, client);
        return { cursor, client: this.project(scope, client) };
      }),
      pageInfo: result.pageInfo,
      totalCount: result.totalCount,
    };
  }

  async create(
    input: CreateOAuthClientInput,
    actor: ApplicationOAuthClientAdminActor
  ): Promise<CreateOAuthClientResult> {
    const value = this.parse(createSchema, input);
    const trustedActor = this.parseActor(actor);
    const failureSafeDiff = {
      clientType: value.clientType,
      environment: value.environment,
      skipConsent: value.skipConsent,
      enableEndSession: value.enableEndSession,
      redirectUriCount: value.redirectUris.length,
      postLogoutRedirectUriCount: value.postLogoutRedirectUris.length,
      changedFields: Object.freeze([
        "name",
        "environment",
        "redirectUris",
        "postLogoutRedirectUris",
        "enableEndSession",
        ...(value.skipConsent ? (["skipConsent"] as const) : []),
      ]),
    } satisfies ApplicationOAuthClientAdminAuditSafeDiff;

    const result = await this.executeWrite({
      actor: trustedActor,
      organizationId: value.organizationId,
      applicationId: value.applicationId,
      permission: value.skipConsent ? "admin" : "write",
      auditAction: "oauth_client_create",
      failureSafeDiff,
      execute: async (scope, currentActor) => {
        const redirectUris = this.normalizeUris(
          value.redirectUris,
          value.environment,
          "redirect"
        );
        const postLogoutRedirectUris = this.normalizeUris(
          value.postLogoutRedirectUris,
          value.environment,
          "post_logout"
        );
        const clientId = this.secretCodec.generateClientId();
        if (value.skipConsent) {
          await this.assertFirstParty(scope, clientId, currentActor);
        }
        const clientSecret =
          value.clientType === "confidential"
            ? this.secretCodec.generateSecret()
            : null;
        const client = await this.clients.createManaged({
          applicationId: scope.applicationId,
          resource: scope.resource,
          clientId,
          clientSecretHash: clientSecret
            ? this.secretCodec.hash(clientSecret)
            : null,
          name: value.name,
          clientType: value.clientType,
          environment: value.environment,
          redirectUris,
          postLogoutRedirectUris,
          skipConsent: value.skipConsent,
          enableEndSession: value.enableEndSession,
          actorId: currentActor.id,
        });
        this.assertProtocolPolicy(scope, client);
        return {
          result: {
            client: this.project(scope, client),
            clientSecret,
          },
          targetId: client.clientId,
          safeDiff: failureSafeDiff,
        };
      },
    });
    await this.invalidation.invalidate(
      result.client.applicationId,
      result.client.clientId
    );
    return result;
  }

  async update(
    input: UpdateOAuthClientInput,
    actor: ApplicationOAuthClientAdminActor
  ): Promise<ApplicationOAuthClient> {
    const value = this.parse(updateSchema, input);
    const trustedActor = this.parseActor(actor);
    const changedFields = mutableChangedFields(value);
    const failureSafeDiff = {
      ...(value.environment !== undefined
        ? { environment: value.environment }
        : {}),
      ...(value.enableEndSession !== undefined
        ? { enableEndSession: value.enableEndSession }
        : {}),
      ...(value.redirectUris !== undefined
        ? { redirectUriCount: value.redirectUris.length }
        : {}),
      ...(value.postLogoutRedirectUris !== undefined
        ? { postLogoutRedirectUriCount: value.postLogoutRedirectUris.length }
        : {}),
      changedFields,
    } satisfies ApplicationOAuthClientAdminAuditSafeDiff;

    const result = await this.executeWrite({
      actor: trustedActor,
      organizationId: value.organizationId,
      applicationId: value.applicationId,
      targetId: value.clientId,
      permission: "write",
      auditAction: "oauth_client_update",
      failureSafeDiff,
      execute: async (scope, currentActor) => {
        const current = await this.requireMutableClient(scope, value.clientId);
        this.assertRevision(current, value.expectedRevision);
        const environment = value.environment ?? current.environment;
        const redirectUris = this.normalizeUris(
          value.redirectUris ?? current.redirectUris,
          environment,
          "redirect"
        );
        const postLogoutRedirectUris = this.normalizeUris(
          value.postLogoutRedirectUris ?? current.postLogoutRedirectUris,
          environment,
          "post_logout"
        );
        const updated = await this.clients.updateManaged({
          applicationId: scope.applicationId,
          clientId: current.clientId,
          expectedRevision: value.expectedRevision,
          actorId: currentActor.id,
          patch: {
            ...(value.name !== undefined ? { name: value.name } : {}),
            ...(value.environment !== undefined
              ? { environment: value.environment }
              : {}),
            ...(value.redirectUris !== undefined ? { redirectUris } : {}),
            ...(value.postLogoutRedirectUris !== undefined
              ? { postLogoutRedirectUris }
              : {}),
            ...(value.enableEndSession !== undefined
              ? { enableEndSession: value.enableEndSession }
              : {}),
          },
        });
        if (!updated) throw revisionConflict();
        this.assertProtocolPolicy(scope, updated);
        return {
          result: this.project(scope, updated),
          targetId: updated.clientId,
          safeDiff: failureSafeDiff,
        };
      },
    });
    await this.invalidation.invalidate(result.applicationId, result.clientId);
    return result;
  }

  async setEnabled(
    input: SetOAuthClientEnabledInput,
    actor: ApplicationOAuthClientAdminActor
  ): Promise<ApplicationOAuthClient> {
    const value = this.parse(enabledSchema, input);
    const trustedActor = this.parseActor(actor);
    const safeDiff = {
      enabled: value.enabled,
      changedFields: Object.freeze(["enabled"] as const),
    } satisfies ApplicationOAuthClientAdminAuditSafeDiff;
    const result = await this.executeWrite({
      actor: trustedActor,
      organizationId: value.organizationId,
      applicationId: value.applicationId,
      targetId: value.clientId,
      permission: "write",
      auditAction: "oauth_client_enabled_set",
      failureSafeDiff: safeDiff,
      execute: async (scope, currentActor) => {
        const current = await this.requireMutableClient(scope, value.clientId);
        this.assertRevision(current, value.expectedRevision);
        const updated = await this.clients.setManagedEnabled({
          applicationId: scope.applicationId,
          clientId: current.clientId,
          enabled: value.enabled,
          expectedRevision: value.expectedRevision,
          actorId: currentActor.id,
        });
        if (!updated) throw revisionConflict();
        this.assertProtocolPolicy(scope, updated);
        return {
          result: this.project(scope, updated),
          targetId: updated.clientId,
          safeDiff,
        };
      },
    });
    await this.invalidation.invalidate(result.applicationId, result.clientId);
    return result;
  }

  async setSkipConsent(
    input: SetOAuthClientSkipConsentInput,
    actor: ApplicationOAuthClientAdminActor
  ): Promise<ApplicationOAuthClient> {
    const value = this.parse(skipConsentSchema, input);
    const trustedActor = this.parseActor(actor);
    const safeDiff = {
      skipConsent: value.skipConsent,
      changedFields: Object.freeze(["skipConsent"] as const),
    } satisfies ApplicationOAuthClientAdminAuditSafeDiff;
    const result = await this.executeWrite({
      actor: trustedActor,
      organizationId: value.organizationId,
      applicationId: value.applicationId,
      targetId: value.clientId,
      permission: "admin",
      auditAction: "oauth_client_skip_consent_set",
      failureSafeDiff: safeDiff,
      execute: async (scope, currentActor) => {
        const current = await this.requireMutableClient(scope, value.clientId);
        this.assertRevision(current, value.expectedRevision);
        if (value.skipConsent) {
          await this.assertFirstParty(scope, current.clientId, currentActor);
        }
        const updated = await this.clients.setManagedSkipConsent({
          applicationId: scope.applicationId,
          clientId: current.clientId,
          skipConsent: value.skipConsent,
          expectedRevision: value.expectedRevision,
          actorId: currentActor.id,
        });
        if (!updated) throw revisionConflict();
        this.assertProtocolPolicy(scope, updated);
        return {
          result: this.project(scope, updated),
          targetId: updated.clientId,
          safeDiff,
        };
      },
    });
    await this.invalidation.invalidate(result.applicationId, result.clientId);
    return result;
  }

  async rotateSecret(
    input: RotateOAuthClientSecretInput,
    actor: ApplicationOAuthClientAdminActor
  ): Promise<RotateSecretResult> {
    const value = this.parse(revisionedClientSchema, input);
    const trustedActor = this.parseActor(actor);
    const safeDiff = {
      changedFields: Object.freeze(["clientSecret"] as const),
    } satisfies ApplicationOAuthClientAdminAuditSafeDiff;
    const result = await this.executeWrite({
      actor: trustedActor,
      organizationId: value.organizationId,
      applicationId: value.applicationId,
      targetId: value.clientId,
      permission: "admin",
      auditAction: "oauth_client_secret_rotate",
      failureSafeDiff: safeDiff,
      execute: async (scope, currentActor) => {
        const current = await this.requireMutableClient(scope, value.clientId);
        this.assertRevision(current, value.expectedRevision);
        if (current.clientType === "public") {
          throw new ApplicationOAuthClientManagementError(
            "Public OAuth clients do not have a client secret",
            "PUBLIC_CLIENT_SECRET_ROTATION_FORBIDDEN"
          );
        }
        if (current.disabled) {
          throw new ApplicationOAuthClientManagementError(
            "Disabled OAuth client secret cannot be rotated",
            "OAUTH_CLIENT_DISABLED"
          );
        }
        const clientSecret = this.secretCodec.generateSecret();
        const updated = await this.clients.rotateManagedSecret({
          applicationId: scope.applicationId,
          clientId: current.clientId,
          clientSecretHash: this.secretCodec.hash(clientSecret),
          expectedRevision: value.expectedRevision,
          actorId: currentActor.id,
        });
        if (!updated) throw revisionConflict();
        this.assertProtocolPolicy(scope, updated);
        return {
          result: {
            client: this.project(scope, updated),
            clientSecret,
          },
          targetId: updated.clientId,
          safeDiff,
        };
      },
    });
    await this.invalidation.invalidate(
      result.client.applicationId,
      result.client.clientId
    );
    return result;
  }

  async archive(
    input: ArchiveOAuthClientInput,
    actor: ApplicationOAuthClientAdminActor
  ): Promise<ApplicationOAuthClient> {
    const value = this.parse(revisionedClientSchema, input);
    const trustedActor = this.parseActor(actor);
    const safeDiff = {
      enabled: false,
      changedFields: Object.freeze(["enabled", "archived"] as const),
    } satisfies ApplicationOAuthClientAdminAuditSafeDiff;
    const result = await this.executeWrite({
      actor: trustedActor,
      organizationId: value.organizationId,
      applicationId: value.applicationId,
      targetId: value.clientId,
      permission: "admin",
      auditAction: "oauth_client_archive",
      failureSafeDiff: safeDiff,
      execute: async (scope, currentActor) => {
        const current = await this.requireMutableClient(scope, value.clientId);
        this.assertRevision(current, value.expectedRevision);
        const archived = await this.clients.archiveManaged({
          applicationId: scope.applicationId,
          clientId: current.clientId,
          expectedRevision: value.expectedRevision,
          actorId: currentActor.id,
        });
        if (!archived) throw revisionConflict();
        this.assertProtocolPolicy(scope, archived);
        return {
          result: this.project(scope, archived),
          targetId: archived.clientId,
          safeDiff,
        };
      },
    });
    await this.invalidation.invalidate(result.applicationId, result.clientId);
    return result;
  }

  private async executeWrite<TResult>(
    input: ExecuteWriteInput<TResult>
  ): Promise<TResult> {
    try {
      const execution = await this.transactions.run(async () => {
        await this.assertAuthorized(
          input.organizationId,
          input.actor,
          input.permission
        );
        const scope = await this.requireScope(
          input.organizationId,
          input.applicationId
        );
        const result = await input.execute(scope, input.actor);
        await this.appendAudit({
          actor: input.actor,
          organizationId: scope.organizationId,
          applicationId: scope.applicationId,
          targetId: result.targetId,
          action: input.auditAction,
          outcome: "success",
          reasonCategory: "success",
          safeDiff: result.safeDiff,
        });
        return result;
      });
      return execution.result;
    } catch (error) {
      const normalized = normalizeManagementError(error);
      await this.appendAudit({
        actor: input.actor,
        organizationId: input.organizationId,
        applicationId: input.applicationId,
        targetId: input.targetId,
        action: input.auditAction,
        outcome: "failure",
        reasonCategory: auditReason(normalized),
        safeDiff: input.failureSafeDiff,
      });
      throw normalized;
    }
  }

  private async appendAudit(input: {
    actor: ApplicationOAuthClientAdminActor;
    organizationId: string;
    applicationId: string;
    targetId?: string;
    action: ApplicationAuthAdminAuditAction;
    outcome: "success" | "failure";
    reasonCategory: ApplicationAuthAdminAuditReasonCategory;
    safeDiff: ApplicationOAuthClientAdminAuditSafeDiff;
  }): Promise<void> {
    try {
      await this.audit.append(
        Object.freeze({
          recordId: randomUUID(),
          schemaVersion: 1,
          occurredAt: this.now().toISOString(),
          category: "application_auth_admin",
          action: input.action,
          outcome: input.outcome,
          reasonCategory: input.reasonCategory,
          actorType: "platform_admin",
          actorId: input.actor.id,
          organizationId: input.organizationId,
          applicationId: input.applicationId,
          targetType: "oauth_client",
          ...(input.targetId ? { targetId: input.targetId } : {}),
          requestId: input.actor.requestId,
          safeDiff: freezeSafeDiff(input.safeDiff),
        })
      );
    } catch {
      throw new ApplicationOAuthClientManagementError(
        "Administrative audit is unavailable",
        "ADMIN_AUDIT_UNAVAILABLE"
      );
    }
  }

  private async assertAuthorized(
    organizationId: string,
    actor: ApplicationOAuthClientAdminActor,
    action: "read" | "write" | "admin"
  ): Promise<void> {
    const allowed = await this.authorizer.authorize({
      subject: actor.id,
      organizationId,
      domain: "org",
      resource: OAUTH_CLIENT_RESOURCE,
      action,
    });
    if (!allowed) {
      throw new ApplicationOAuthClientManagementError(
        "OAuth client operation is not permitted",
        "FORBIDDEN"
      );
    }
  }

  private async requireScope(
    organizationId: string,
    applicationId: string
  ): Promise<ApplicationOAuthClientManagementScope> {
    const scope = await this.clients.findManagementScope(
      organizationId,
      applicationId
    );
    if (!scope) {
      throw new ApplicationOAuthClientManagementError(
        "Application was not found",
        "APPLICATION_NOT_FOUND"
      );
    }
    if (scope.resource !== createApplicationResource(scope.applicationId)) {
      throw new ApplicationOAuthClientManagementError(
        "Application auth configuration is invalid",
        "APPLICATION_AUTH_CONFIGURATION_INVALID"
      );
    }
    return scope;
  }

  private async requireClient(
    scope: ApplicationOAuthClientManagementScope,
    clientId: string,
    includeArchived: boolean
  ): Promise<ManagedApplicationOAuthClient> {
    const client = await this.clients.findManaged(scope.applicationId, clientId, {
      includeArchived,
    });
    if (!client) {
      throw new ApplicationOAuthClientManagementError(
        "OAuth client was not found",
        "OAUTH_CLIENT_NOT_FOUND"
      );
    }
    this.assertProtocolPolicy(scope, client);
    return client;
  }

  private async requireMutableClient(
    scope: ApplicationOAuthClientManagementScope,
    clientId: string
  ): Promise<ManagedApplicationOAuthClient> {
    const client = await this.requireClient(scope, clientId, true);
    if (client.archived) {
      throw new ApplicationOAuthClientManagementError(
        "Archived OAuth client cannot be changed",
        "OAUTH_CLIENT_ARCHIVED"
      );
    }
    return client;
  }

  private assertRevision(
    client: ManagedApplicationOAuthClient,
    expectedRevision: number
  ): void {
    if (client.revision !== expectedRevision) throw revisionConflict();
  }

  private assertProtocolPolicy(
    scope: ApplicationOAuthClientManagementScope,
    client: ManagedApplicationOAuthClient
  ): void {
    const expectedAuthMethod =
      client.clientType === "public" ? "none" : "client_secret_basic";
    if (
      client.applicationId !== scope.applicationId ||
      client.resourceAudience !== scope.resource ||
      client.protocolPolicyVersion !==
        APPLICATION_OAUTH_PROTOCOL_POLICY_VERSION ||
      !client.requirePKCE ||
      client.tokenEndpointAuthMethod !== expectedAuthMethod ||
      !hasExactValues(client.grantTypes, APPLICATION_OAUTH_GRANT_TYPES) ||
      !hasExactValues(client.responseTypes, APPLICATION_OAUTH_RESPONSE_TYPES)
    ) {
      throw new ApplicationOAuthClientManagementError(
        "OAuth client protocol policy is invalid",
        "OAUTH_CLIENT_INTERNAL_ERROR"
      );
    }
  }

  private async assertFirstParty(
    scope: ApplicationOAuthClientManagementScope,
    clientId: string,
    actor: ApplicationOAuthClientAdminActor
  ): Promise<void> {
    const confirmed = await this.firstPartyPolicy.isConfirmedFirstParty({
      actorId: actor.id,
      organizationId: scope.organizationId,
      applicationId: scope.applicationId,
      clientId,
    });
    if (!confirmed) {
      throw new ApplicationOAuthClientManagementError(
        "Consent can be skipped only for a confirmed first-party client",
        "FIRST_PARTY_CLIENT_REQUIRED"
      );
    }
  }

  private normalizeUris(
    values: readonly string[],
    environment: ManagedApplicationOAuthClientEnvironment,
    kind: "redirect" | "post_logout"
  ): string[] {
    const normalized = values.map((value) =>
      normalizeOAuthClientUri(
        value,
        environment,
        this.allowedMobileSchemes,
        kind
      )
    );
    if (new Set(normalized).size !== normalized.length) {
      throw uriError(kind, "OAuth client URIs must be unique");
    }
    return normalized;
  }

  private project(
    scope: ApplicationOAuthClientManagementScope,
    client: ManagedApplicationOAuthClient
  ): ApplicationOAuthClient {
    this.assertProtocolPolicy(scope, client);
    return Object.freeze({
      id: client.id,
      organizationId: scope.organizationId,
      applicationId: client.applicationId,
      clientId: client.clientId,
      name: client.name,
      clientType: client.clientType,
      environment: client.environment,
      redirectUris: Object.freeze([...client.redirectUris]),
      postLogoutRedirectUris: Object.freeze([
        ...client.postLogoutRedirectUris,
      ]),
      resources: Object.freeze([scope.resource]) as readonly [string],
      grantTypes: Object.freeze([...client.grantTypes]),
      responseTypes: Object.freeze([...client.responseTypes]),
      tokenEndpointAuthMethod: client.tokenEndpointAuthMethod,
      requirePKCE: client.requirePKCE,
      protocolPolicyVersion: client.protocolPolicyVersion,
      skipConsent: client.skipConsent,
      enableEndSession: client.enableEndSession,
      disabled: client.disabled,
      archived: client.archived,
      revision: client.revision,
      createdAt: client.createdAt,
      updatedAt: client.updatedAt,
      archivedAt: client.archivedAt,
      createdBy: client.createdBy,
      updatedBy: client.updatedBy,
    });
  }

  private parse<TSchema extends z.ZodTypeAny>(
    schema: TSchema,
    input: unknown
  ): z.infer<TSchema> {
    try {
      return schema.parse(input);
    } catch (error) {
      throw normalizeManagementError(error);
    }
  }

  private parseActor(
    actor: ApplicationOAuthClientAdminActor
  ): ApplicationOAuthClientAdminActor {
    const result = actorSchema.safeParse(actor);
    if (!result.success) {
      throw new ApplicationOAuthClientManagementError(
        "Authenticated platform administrator is required",
        "UNAUTHENTICATED"
      );
    }
    return result.data;
  }
}

function normalizeOAuthClientUri(
  value: string,
  environment: ManagedApplicationOAuthClientEnvironment,
  allowedMobileSchemes: ReadonlySet<string>,
  kind: "redirect" | "post_logout"
): string {
  if (value !== value.trim() || value.includes("*")) {
    throw uriError(kind, "OAuth client URI is not exact");
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw uriError(kind, "OAuth client URI is invalid");
  }
  if (url.hash || url.username || url.password) {
    throw uriError(kind, "OAuth client URI contains a forbidden component");
  }
  try {
    if (decodeURIComponent(`${url.pathname}${url.search}`).includes("*")) {
      throw uriError(kind, "OAuth client URI is not exact");
    }
  } catch (error) {
    if (error instanceof ApplicationOAuthClientManagementError) throw error;
    throw uriError(kind, "OAuth client URI encoding is invalid");
  }
  if (url.protocol === "https:") return url.href;

  if (url.protocol === "http:") {
    if (environment !== "development" || !isLoopbackHost(url.hostname)) {
      throw uriError(
        kind,
        "HTTP OAuth client URIs are allowed only for loopback development clients"
      );
    }
    return url.href;
  }

  const mobileScheme = normalizeMobileScheme(url.protocol);
  if (!allowedMobileSchemes.has(mobileScheme)) {
    throw uriError(kind, "OAuth client URI scheme is not allowed");
  }
  return url.href;
}

function normalizeMobileScheme(value: string): string {
  const scheme = value.trim().toLowerCase().replace(/:$/, "");
  if (!/^[a-z][a-z0-9+.-]*$/.test(scheme) || scheme === "http" || scheme === "https") {
    throw new Error("Invalid mobile OAuth URI scheme policy");
  }
  return scheme;
}

function isLoopbackHost(hostname: string): boolean {
  const value = hostname.toLowerCase();
  return (
    value === "localhost" ||
    value === "127.0.0.1" ||
    value === "[::1]" ||
    value === "::1"
  );
}

function uriError(
  kind: "redirect" | "post_logout",
  message: string
): ApplicationOAuthClientManagementError {
  return new ApplicationOAuthClientManagementError(
    message,
    kind === "redirect"
      ? "INVALID_REDIRECT_URI"
      : "INVALID_POST_LOGOUT_REDIRECT_URI"
  );
}

function revisionConflict(): ApplicationOAuthClientManagementError {
  return new ApplicationOAuthClientManagementError(
    "OAuth client revision conflict",
    "OAUTH_CLIENT_REVISION_CONFLICT"
  );
}

function hasExactValues(
  values: readonly string[],
  expected: readonly string[]
): boolean {
  return (
    values.length === expected.length &&
    values.every((value, index) => value === expected[index])
  );
}

function unique<T>(values: readonly T[] | undefined): T[] | undefined {
  return values ? [...new Set(values)] : undefined;
}

function mutableChangedFields(input: {
  name?: string;
  environment?: ManagedApplicationOAuthClientEnvironment;
  redirectUris?: readonly string[];
  postLogoutRedirectUris?: readonly string[];
  enableEndSession?: boolean;
}): ApplicationOAuthClientAdminAuditSafeDiff["changedFields"] {
  return Object.freeze([
    ...(input.name !== undefined ? (["name"] as const) : []),
    ...(input.environment !== undefined ? (["environment"] as const) : []),
    ...(input.redirectUris !== undefined ? (["redirectUris"] as const) : []),
    ...(input.postLogoutRedirectUris !== undefined
      ? (["postLogoutRedirectUris"] as const)
      : []),
    ...(input.enableEndSession !== undefined
      ? (["enableEndSession"] as const)
      : []),
  ]);
}

function freezeSafeDiff(
  diff: ApplicationOAuthClientAdminAuditSafeDiff
): Readonly<ApplicationOAuthClientAdminAuditSafeDiff> {
  return Object.freeze({
    ...diff,
    ...(diff.changedFields
      ? { changedFields: Object.freeze([...diff.changedFields]) }
      : {}),
  });
}

function normalizeManagementError(
  error: unknown
): ApplicationOAuthClientManagementError {
  if (error instanceof ApplicationOAuthClientManagementError) return error;
  if (error instanceof ZodError) {
    return new ApplicationOAuthClientManagementError(
      "OAuth client input is invalid",
      "INVALID_INPUT",
      {
        issues: error.issues.map((issue) => ({
          path: issue.path,
          code: issue.code,
          message: issue.message,
        })),
      }
    );
  }
  return new ApplicationOAuthClientManagementError(
    "OAuth client operation failed",
    "OAUTH_CLIENT_INTERNAL_ERROR"
  );
}

function auditReason(
  error: ApplicationOAuthClientManagementError
): ApplicationAuthAdminAuditReasonCategory {
  switch (error.code) {
    case "UNAUTHENTICATED":
      return "unauthenticated";
    case "FORBIDDEN":
      return "forbidden";
    case "APPLICATION_NOT_FOUND":
    case "APPLICATION_AUTH_CONFIGURATION_INVALID":
      return "scope_not_found";
    case "OAUTH_CLIENT_NOT_FOUND":
      return "client_not_found";
    case "INVALID_INPUT":
      return "invalid_input";
    case "INVALID_REDIRECT_URI":
    case "INVALID_POST_LOGOUT_REDIRECT_URI":
      return "invalid_uri";
    case "FIRST_PARTY_CLIENT_REQUIRED":
      return "first_party_required";
    case "OAUTH_CLIENT_ARCHIVED":
    case "OAUTH_CLIENT_DISABLED":
    case "PUBLIC_CLIENT_SECRET_ROTATION_FORBIDDEN":
      return "invalid_client_state";
    case "OAUTH_CLIENT_REVISION_CONFLICT":
      return "revision_conflict";
    case "ADMIN_AUDIT_UNAVAILABLE":
      return "audit_unavailable";
    case "OAUTH_CLIENT_INTERNAL_ERROR":
      return "internal_error";
  }
}

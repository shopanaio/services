import {
  createAdapterFactory,
  type AdapterFactoryConfig,
  type AdapterFactoryCustomizeAdapterCreator,
  type CleanedWhere,
  type CustomAdapter,
  type DBAdapterInstance as CoreDBAdapterInstance,
} from "@better-auth/core/db/adapter";
import { BetterAuthError } from "@better-auth/core/error";
import type { BetterAuthOptions as CoreBetterAuthOptions } from "@better-auth/core";
import type { BetterAuthOptions, DBAdapterInstance } from "better-auth";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  like,
  lt,
  lte,
  ne,
  notInArray,
  or,
  sql,
} from "drizzle-orm";
import type { Database } from "../infrastructure/db/database.js";
import {
  account,
  application,
  applicationAccount,
  applicationAuthConfiguration,
  applicationJwks,
  applicationOauthAccessToken,
  applicationOauthClient,
  applicationOauthConsent,
  applicationOauthRefreshToken,
  applicationSession,
  applicationUser,
  applicationVerification,
  jwks,
  organization,
  session,
  user,
  verification,
} from "../repositories/models/index.js";
import {
  assertApplicationId,
  type AuthAdapterScope,
} from "./AuthScope.js";
import type { ApplicationAuthKeyring } from "../services/ApplicationAuthKeyring.js";
import { createApplicationResource } from "./applicationAuthConfiguration.js";
import {
  APPLICATION_OAUTH_GRANT_TYPES,
  APPLICATION_OAUTH_PROTOCOL_POLICY_VERSION,
  APPLICATION_OAUTH_RESPONSE_TYPES,
  createApplicationOAuthClientPolicyMetadata,
  hasExactStringValues,
} from "./applicationOAuthPolicy.js";
import {
  createApplicationAuthLiveStateInvalidationEvent,
  type ApplicationAuthLiveStateInvalidationBus,
} from "../events/application-auth/index.js";

type DrizzleConnection = any;

const platformAuthSchema = {
  user,
  session,
  account,
  verification,
  jwks,
};

const applicationAuthSchema = {
  user: applicationUser,
  session: applicationSession,
  account: applicationAccount,
  verification: applicationVerification,
  jwks: applicationJwks,
  oauthClient: applicationOauthClient,
  oauthRefreshToken: applicationOauthRefreshToken,
  oauthAccessToken: applicationOauthAccessToken,
  oauthConsent: applicationOauthConsent,
};

type AuthModelName =
  | keyof typeof platformAuthSchema
  | keyof typeof applicationAuthSchema;

const APPLICATION_SCOPED_MODELS = new Set<AuthModelName>([
  "user",
  "account",
  "session",
  "verification",
  "jwks",
  "oauthClient",
  "oauthRefreshToken",
  "oauthAccessToken",
  "oauthConsent",
]);

const IMMUTABLE_OAUTH_CLIENT_FIELDS = new Set([
  "applicationId",
  "clientId",
  "grantTypes",
  "responseTypes",
  "requirePKCE",
  "resourceAudience",
  "protocolPolicyVersion",
  "metadata",
]);

/**
 * A Better Auth Drizzle adapter whose raw persistence operations are scoped.
 *
 * Scoping below createAdapterFactory is important: Better Auth's fallback joins
 * call the raw CustomAdapter directly. Keeping the boundary here guarantees
 * that user -> account joins cannot load credentials from another application.
 */
export function createScopedDrizzleAdapter(
  db: Database,
  scope: AuthAdapterScope,
  security?: {
    keyring: ApplicationAuthKeyring;
    liveStateInvalidation?: ApplicationAuthLiveStateInvalidationBus;
  }
): DBAdapterInstance<BetterAuthOptions> {
  if (scope.kind === "application") {
    assertApplicationId(scope.applicationId);
    if (!security?.keyring) {
      throw new BetterAuthError(
        "Application auth keyring is required for scoped persistence"
      );
    }
  }

  let lazyOptions: CoreBetterAuthOptions | undefined;
  const baseConfig: Omit<AdapterFactoryConfig, "transaction"> = {
    adapterId: "shopana-scoped-drizzle",
    adapterName: "Shopana Scoped Drizzle Adapter",
    usePlural: false,
    debugLogs: false,
    supportsUUIDs: true,
    supportsJSON: true,
    supportsArrays: true,
    customTransformOutput: ({ data, fieldAttributes }) => {
      if (fieldAttributes.type !== "date" || data == null) return data;
      return new Date(data as string | number | Date);
    },
  };

  const createCustomAdapter = createScopedCustomAdapter(
    scope,
    security?.keyring,
    security?.liveStateInvalidation
  );
  const adapterFactory = createAdapterFactory<CoreBetterAuthOptions>({
    config: {
      ...baseConfig,
      transaction: (callback) =>
        db.transaction((transaction) => {
          if (!lazyOptions) {
            throw new Error("Better Auth adapter is not initialized");
          }

          const transactionAdapter = createAdapterFactory<CoreBetterAuthOptions>({
            config: {
              ...baseConfig,
              transaction: false,
            },
            adapter: createCustomAdapter(transaction),
          })(lazyOptions);

          return callback(transactionAdapter);
        }),
    },
    adapter: createCustomAdapter(db),
  });

  const instance: CoreDBAdapterInstance<CoreBetterAuthOptions> = (options) => {
    if (options.experimental?.joins) {
      throw new BetterAuthError(
        "Shopana scoped auth does not support Better Auth native joins"
      );
    }

    lazyOptions = options;
    return adapterFactory(options);
  };

  return instance as unknown as DBAdapterInstance<BetterAuthOptions>;
}

function createScopedCustomAdapter(
  scope: AuthAdapterScope,
  keyring?: ApplicationAuthKeyring,
  liveStateInvalidation?: ApplicationAuthLiveStateInvalidationBus
): (connection: DrizzleConnection) => AdapterFactoryCustomizeAdapterCreator {
  return (connection) =>
    ({ getDefaultModelName, getFieldName }): CustomAdapter => {
      const schema: Partial<Record<AuthModelName, unknown>> =
        scope.kind === "application"
          ? applicationAuthSchema
          : platformAuthSchema;

      const getSchemaModel = (model: string): Record<string, any> => {
        const defaultModel = getDefaultModelName(model) as AuthModelName;
        const schemaModel = schema[defaultModel];
        if (!schemaModel) {
          throw new BetterAuthError(
            `The model "${model}" was not found in the IAM auth schema`
          );
        }
        return schemaModel as unknown as Record<string, any>;
      };

      const isScopedModel = (model: string): boolean =>
        scope.kind === "application" &&
        APPLICATION_SCOPED_MODELS.has(
          getDefaultModelName(model) as AuthModelName
        );

      const isApplicationUserModel = (model: string): boolean =>
        scope.kind === "application" &&
        getDefaultModelName(model) === "user";

      const isApplicationJwksModel = (model: string): boolean =>
        scope.kind === "application" &&
        getDefaultModelName(model) === "jwks";

      const isApplicationPasswordResetVerification = (
        model: string,
        data: Record<string, any>
      ): boolean =>
        scope.kind === "application" &&
        getDefaultModelName(model) === "verification" &&
        typeof data.identifier === "string" &&
        data.identifier.startsWith("reset-password:") &&
        typeof data.value === "string" &&
        data.value.length > 0;

      const isApplicationOauthClientModel = (model: string): boolean =>
        scope.kind === "application" &&
        getDefaultModelName(model) === "oauthClient";

      const scopeData = (
        model: string,
        data: unknown,
        operation: "create" | "update"
      ): Record<string, any> => {
        const record = data as Record<string, any>;
        if (!isScopedModel(model)) return record;
        if (scope.kind !== "application") return record;

        if (
          record.applicationId !== undefined &&
          record.applicationId !== scope.applicationId
        ) {
          throw new BetterAuthError(
            "Cross-application auth model input is forbidden"
          );
        }

        if (operation === "update") {
          if (
            isApplicationOauthClientModel(model) &&
            Object.keys(record).some((field) =>
              IMMUTABLE_OAUTH_CLIENT_FIELDS.has(field)
            )
          ) {
            throw new BetterAuthError(
              "OAuth client protocol policy fields are immutable"
            );
          }
          const { applicationId: _applicationId, ...update } = record;
          return update;
        }

        if (!isApplicationOauthClientModel(model)) {
          return {
            ...record,
            applicationId: scope.applicationId,
          };
        }

        const resource = createApplicationResource(scope.applicationId);
        if (
          record.resourceAudience !== undefined &&
          record.resourceAudience !== resource
        ) {
          throw new BetterAuthError(
            "OAuth client resource is owned by the application realm"
          );
        }
        if (
          record.grantTypes !== undefined &&
          !hasExactStringValues(record.grantTypes, APPLICATION_OAUTH_GRANT_TYPES)
        ) {
          throw new BetterAuthError(
            "OAuth client grant types violate protocol policy v1"
          );
        }
        if (
          record.responseTypes !== undefined &&
          !hasExactStringValues(
            record.responseTypes,
            APPLICATION_OAUTH_RESPONSE_TYPES
          )
        ) {
          throw new BetterAuthError(
            "OAuth client response types violate protocol policy v1"
          );
        }
        if (record.requirePKCE !== undefined && record.requirePKCE !== true) {
          throw new BetterAuthError("OAuth clients must require PKCE");
        }
        if (
          record.protocolPolicyVersion !== undefined &&
          record.protocolPolicyVersion !==
            APPLICATION_OAUTH_PROTOCOL_POLICY_VERSION
        ) {
          throw new BetterAuthError(
            "OAuth client protocol policy version is invalid"
          );
        }
        if (typeof record.clientId !== "string" || !record.clientId) {
          throw new BetterAuthError("OAuth client id is required");
        }

        return {
          ...record,
          applicationId: scope.applicationId,
          resourceAudience: resource,
          grantTypes: [...APPLICATION_OAUTH_GRANT_TYPES],
          responseTypes: [...APPLICATION_OAUTH_RESPONSE_TYPES],
          requirePKCE: true,
          protocolPolicyVersion: APPLICATION_OAUTH_PROTOCOL_POLICY_VERSION,
          metadata: createApplicationOAuthClientPolicyMetadata({
            applicationId: scope.applicationId,
            clientId: record.clientId,
            resource,
            metadata: record.metadata,
          }),
        };
      };

      const encryptJwksPrivateKey = (
        model: string,
        data: Record<string, any>,
        rowId?: string
      ): Record<string, any> => {
        if (!isApplicationJwksModel(model) || data.privateKey === undefined) {
          return data;
        }
        if (scope.kind !== "application" || !keyring) {
          throw new BetterAuthError("Application auth keyring is unavailable");
        }
        const id = rowId ?? data.id;
        if (typeof id !== "string" || !id) {
          throw new BetterAuthError(
            "Application JWKS private key encryption requires a row id"
          );
        }
        if (typeof data.privateKey !== "string" || !data.privateKey) {
          throw new BetterAuthError("Application JWKS private key is invalid");
        }
        return {
          ...data,
          privateKey: keyring.encrypt(data.privateKey, {
            applicationId: scope.applicationId,
            model: "jwks",
            rowId: id,
            field: "privateKey",
          }),
          privateKeyKeyVersion: keyring.activeVersion,
        };
      };

      const decryptJwksPrivateKey = <T>(
        model: string,
        data: T | null
      ): T | null => {
        if (!data || !isApplicationJwksModel(model)) return data;
        const record = data as Record<string, any>;
        if (record.privateKey === undefined) return data;
        if (scope.kind !== "application" || !keyring) {
          throw new BetterAuthError("Application auth keyring is unavailable");
        }
        if (
          typeof record.id !== "string" ||
          typeof record.privateKey !== "string" ||
          typeof record.privateKeyKeyVersion !== "number"
        ) {
          throw new BetterAuthError(
            "Application JWKS encrypted record is incomplete"
          );
        }
        if (
          keyring.getEnvelopeKeyVersion(record.privateKey) !==
          record.privateKeyKeyVersion
        ) {
          throw new BetterAuthError(
            "Application JWKS private key version mismatch"
          );
        }
        return {
          ...record,
          privateKey: keyring.decrypt(record.privateKey, {
            applicationId: scope.applicationId,
            model: "jwks",
            rowId: record.id,
            field: "privateKey",
          }),
        } as T;
      };

      const getColumn = (
        schemaModel: Record<string, any>,
        model: string,
        field: string
      ) => {
        const fieldName = getFieldName({ model, field });
        const column = schemaModel[fieldName];
        if (!column) {
          throw new BetterAuthError(
            `The field "${field}" does not exist in the schema for model "${model}"`
          );
        }
        return column;
      };

      const getApplicationConditions = (
        model: string,
        schemaModel: Record<string, any>
      ) => {
        if (!isScopedModel(model) || scope.kind !== "application") return [];

        const activeApplicationIds = connection
          .select({ id: application.id })
          .from(application)
          .innerJoin(
            organization,
            eq(organization.id, application.organizationId)
          )
          .innerJoin(
            applicationAuthConfiguration,
            eq(
              applicationAuthConfiguration.applicationId,
              application.id
            )
          )
          .where(
            and(
              eq(application.id, scope.applicationId),
              isNull(application.deletedAt),
              isNull(organization.deletedAt),
              eq(applicationAuthConfiguration.realmEnabled, true)
            )
          );
        const conditions = [
          eq(schemaModel.applicationId, scope.applicationId),
          inArray(schemaModel.applicationId, activeApplicationIds),
        ];

        if (isApplicationUserModel(model)) {
          conditions.push(eq(schemaModel.status, "active"));
        }
        if (isApplicationOauthClientModel(model)) {
          conditions.push(
            eq(schemaModel.disabled, false),
            isNull(schemaModel.deletedAt)
          );
        }

        return conditions;
      };

      const assertApplicationWriteAllowed = async (
        model: string,
        values: Record<string, any>,
        operation: "create" | "update"
      ): Promise<void> => {
        if (!isScopedModel(model) || scope.kind !== "application") return;

        const [activeApplication] = await connection
          .select({
            id: application.id,
            resource: applicationAuthConfiguration.resource,
          })
          .from(application)
          .innerJoin(
            organization,
            eq(organization.id, application.organizationId)
          )
          .innerJoin(
            applicationAuthConfiguration,
            eq(
              applicationAuthConfiguration.applicationId,
              application.id
            )
          )
          .where(
            and(
              eq(application.id, scope.applicationId),
              isNull(application.deletedAt),
              isNull(organization.deletedAt),
              eq(applicationAuthConfiguration.realmEnabled, true)
            )
          )
          .limit(1);
        if (!activeApplication) {
          throw new BetterAuthError("Application auth realm is not active");
        }

        const defaultModel = getDefaultModelName(model) as AuthModelName;
        if (
          operation === "create" &&
          ["oauthRefreshToken", "oauthAccessToken", "oauthConsent"].includes(
            defaultModel
          ) &&
          typeof values.userId !== "string"
        ) {
          throw new BetterAuthError(
            "Application OAuth v1 models require an application user"
          );
        }
        const assertActiveUser = async (userId: string): Promise<void> => {
          const [activeUser] = await connection
            .select({ id: applicationUser.id })
            .from(applicationUser)
            .where(
              and(
                eq(applicationUser.applicationId, scope.applicationId),
                eq(applicationUser.id, userId),
                eq(applicationUser.status, "active")
              )
            )
            .limit(1);
          if (!activeUser) {
            throw new BetterAuthError(
              "Application auth model requires an active scoped user"
            );
          }
        };
        const assertActiveClient = async (clientId: string): Promise<void> => {
          const [activeClient] = await connection
            .select({ id: applicationOauthClient.id })
            .from(applicationOauthClient)
            .where(
              and(
                eq(applicationOauthClient.applicationId, scope.applicationId),
                eq(applicationOauthClient.clientId, clientId),
                eq(applicationOauthClient.disabled, false),
                isNull(applicationOauthClient.deletedAt)
              )
            )
            .limit(1);
          if (!activeClient) {
            throw new BetterAuthError(
              "Application OAuth model requires an active scoped client"
            );
          }
        };
        const assertSession = async (sessionId: string): Promise<void> => {
          const [applicationSessionRecord] = await connection
            .select({ id: applicationSession.id })
            .from(applicationSession)
            .where(
              and(
                eq(applicationSession.applicationId, scope.applicationId),
                eq(applicationSession.id, sessionId)
              )
            )
            .limit(1);
          if (!applicationSessionRecord) {
            throw new BetterAuthError(
              "Application OAuth model requires a scoped session"
            );
          }
        };
        const assertRefreshToken = async (
          refreshTokenId: string
        ): Promise<void> => {
          const [refreshToken] = await connection
            .select({ id: applicationOauthRefreshToken.id })
            .from(applicationOauthRefreshToken)
            .where(
              and(
                eq(
                  applicationOauthRefreshToken.applicationId,
                  scope.applicationId
                ),
                eq(applicationOauthRefreshToken.id, refreshTokenId)
              )
            )
            .limit(1);
          if (!refreshToken) {
            throw new BetterAuthError(
              "Application OAuth access token requires a scoped refresh token"
            );
          }
        };

        if (
          [
            "account",
            "session",
            "oauthClient",
            "oauthRefreshToken",
            "oauthAccessToken",
            "oauthConsent",
          ].includes(defaultModel) &&
          typeof values.userId === "string"
        ) {
          await assertActiveUser(values.userId);
        }

        if (defaultModel === "oauthClient") {
          if (
            operation === "create" &&
            values.resourceAudience !== activeApplication.resource
          ) {
            throw new BetterAuthError(
              "OAuth client resource does not match its application realm"
            );
          }
          return;
        }

        if (
          ["oauthRefreshToken", "oauthAccessToken", "oauthConsent"].includes(
            defaultModel
          ) &&
          typeof values.clientId === "string"
        ) {
          await assertActiveClient(values.clientId);
        }
        if (
          (defaultModel === "oauthRefreshToken" ||
            defaultModel === "oauthAccessToken") &&
          typeof values.sessionId === "string"
        ) {
          await assertSession(values.sessionId);
        }
        if (
          defaultModel === "oauthAccessToken" &&
          typeof values.refreshId === "string"
        ) {
          await assertRefreshToken(values.refreshId);
        }
      };

      const convertCondition = (
        schemaModel: Record<string, any>,
        model: string,
        item: CleanedWhere
      ) => {
        const column = getColumn(schemaModel, model, item.field);
        const insensitive =
          item.mode === "insensitive" &&
          (typeof item.value === "string" ||
            (Array.isArray(item.value) &&
              item.value.every((value) => typeof value === "string")));

        switch (item.operator) {
          case "in":
            if (!Array.isArray(item.value)) {
              throw new BetterAuthError(
                `The value for "${item.field}" must be an array for the in operator`
              );
            }
            if (insensitive) {
              if (item.value.length === 0) return sql`false`;
              return sql`LOWER(${column}) IN (${sql.join(
                item.value.map((value) => sql`LOWER(${value})`),
                sql`, `
              )})`;
            }
            return inArray(column, item.value);
          case "not_in":
            if (!Array.isArray(item.value)) {
              throw new BetterAuthError(
                `The value for "${item.field}" must be an array for the not_in operator`
              );
            }
            if (insensitive) {
              if (item.value.length === 0) return sql`true`;
              return sql`LOWER(${column}) NOT IN (${sql.join(
                item.value.map((value) => sql`LOWER(${value})`),
                sql`, `
              )})`;
            }
            return notInArray(column, item.value);
          case "contains":
            return insensitive
              ? ilike(column, `%${String(item.value)}%`)
              : like(column, `%${String(item.value)}%`);
          case "starts_with":
            return insensitive
              ? ilike(column, `${String(item.value)}%`)
              : like(column, `${String(item.value)}%`);
          case "ends_with":
            return insensitive
              ? ilike(column, `%${String(item.value)}`)
              : like(column, `%${String(item.value)}`);
          case "lt":
            return lt(column, item.value);
          case "lte":
            return lte(column, item.value);
          case "gt":
            return gt(column, item.value);
          case "gte":
            return gte(column, item.value);
          case "ne":
            if (item.value === null) return isNotNull(column);
            return insensitive && typeof item.value === "string"
              ? sql`LOWER(${column}) <> LOWER(${item.value})`
              : ne(column, item.value);
          default:
            if (item.value === null) return isNull(column);
            return insensitive && typeof item.value === "string"
              ? sql`LOWER(${column}) = LOWER(${item.value})`
              : eq(column, item.value);
        }
      };

      const convertWhere = (
        model: string,
        where: CleanedWhere[] | undefined
      ) => {
        const schemaModel = getSchemaModel(model);
        const scopedWhere = where ?? [];
        const applicationConditions = getApplicationConditions(
          model,
          schemaModel
        );

        const andConditions = scopedWhere
          .filter((item) => item.connector !== "OR")
          .map((item) => convertCondition(schemaModel, model, item));
        const orConditions = scopedWhere
          .filter((item) => item.connector === "OR")
          .map((item) => convertCondition(schemaModel, model, item));

        const andClause = and(...andConditions);
        const orClause = or(...orConditions);
        const whereClause =
          andClause && orClause
            ? and(andClause, orClause)
            : andClause ?? orClause;

        if (whereClause && applicationConditions.length) {
          return [and(whereClause, ...applicationConditions)];
        }
        if (whereClause) return [whereClause];
        if (applicationConditions.length) {
          return [and(...applicationConditions)];
        }
        return [];
      };

      const createSelection = (
        schemaModel: Record<string, any>,
        model: string,
        fields: string[] | undefined
      ) => {
        if (!fields?.length) return undefined;
        const selection = fields.reduce<Record<string, any>>((result, field) => {
          const fieldName = getFieldName({ model, field });
          result[fieldName] = getColumn(schemaModel, model, field);
          return result;
        }, {});
        if (
          isApplicationJwksModel(model) &&
          Object.prototype.hasOwnProperty.call(selection, "privateKey")
        ) {
          selection.id = schemaModel.id;
          selection.privateKeyKeyVersion = schemaModel.privateKeyKeyVersion;
        }
        return selection;
      };

      const ensureNoNativeJoin = (join: unknown): void => {
        if (join && Object.keys(join as object).length > 0) {
          throw new BetterAuthError(
            "Native joins are disabled for Shopana scoped auth"
          );
        }
      };

      const prepareApplicationSessionDeletion = async (
        model: string,
        where: CleanedWhere[] | undefined
      ): Promise<Array<{ id: string; userId: string }>> => {
        if (
          scope.kind !== "application" ||
          getDefaultModelName(model) !== "session"
        ) {
          return [];
        }
        const sessionModel = getSchemaModel(model);
        const sessions = await connection
          .select({ id: sessionModel.id, userId: sessionModel.userId })
          .from(sessionModel)
          .where(...convertWhere(model, where));
        if (!sessions.length) return [];
        const targetSessionIds = connection
          .select({ id: sessionModel.id })
          .from(sessionModel)
          .where(...convertWhere(model, where));
        await connection
          .delete(applicationOauthAccessToken)
          .where(
            and(
              eq(
                applicationOauthAccessToken.applicationId,
                scope.applicationId
              ),
              inArray(
                applicationOauthAccessToken.sessionId,
                targetSessionIds
              )
            )
          );
        await connection
          .update(applicationOauthRefreshToken)
          .set({ revoked: new Date(), sessionId: null })
          .where(
            and(
              eq(
                applicationOauthRefreshToken.applicationId,
                scope.applicationId
              ),
              inArray(
                applicationOauthRefreshToken.sessionId,
                targetSessionIds
              )
            )
          );
        return sessions;
      };

      const publishSessionInvalidations = async (
        sessions: Array<{ id: string; userId: string }>
      ): Promise<void> => {
        if (
          scope.kind !== "application" ||
          !liveStateInvalidation ||
          sessions.length === 0
        ) {
          return;
        }
        await Promise.all(
          sessions.map((session) =>
            liveStateInvalidation.publish(
              createApplicationAuthLiveStateInvalidationEvent({
                kind: "session",
                applicationId: scope.applicationId,
                userId: session.userId,
                sessionId: session.id,
              })
            )
          )
        );
      };

      const adapter: CustomAdapter = {
        async create({ model, data }) {
          const schemaModel = getSchemaModel(model);
          const values = encryptJwksPrivateKey(
            model,
            scopeData(model, data, "create")
          );
          await assertApplicationWriteAllowed(model, values, "create");
          const insert = connection.insert(schemaModel).values(values);
          const rows = isApplicationPasswordResetVerification(model, values)
            ? await insert
                .onConflictDoUpdate({
                  target: [
                    applicationVerification.applicationId,
                    applicationVerification.value,
                  ],
                  targetWhere: sql`${applicationVerification.identifier} LIKE 'reset-password:%'`,
                  set: {
                    id: values.id,
                    identifier: values.identifier,
                    expiresAt: values.expiresAt,
                    createdAt: values.createdAt,
                    updatedAt: values.updatedAt,
                  },
                })
                .returning()
            : await insert.returning();
          const created = rows[0];
          if (!created) {
            throw new BetterAuthError(`Failed to create auth model "${model}"`);
          }
          return decryptJwksPrivateKey(model, created);
        },

        async findOne({ model, where, select, join }) {
          ensureNoNativeJoin(join);
          const schemaModel = getSchemaModel(model);
          const selection = createSelection(schemaModel, model, select);
          const rows = await connection
            .select(selection)
            .from(schemaModel)
            .where(...convertWhere(model, where))
            .limit(1);
          return decryptJwksPrivateKey(model, rows[0] ?? null);
        },

        async findMany({ model, where, select, sortBy, limit, offset, join }) {
          ensureNoNativeJoin(join);
          const schemaModel = getSchemaModel(model);
          const selection = createSelection(schemaModel, model, select);
          let query = connection.select(selection).from(schemaModel);
          const clauses = convertWhere(model, where);
          if (clauses.length) query = query.where(...clauses);
          if (sortBy?.field) {
            const column = getColumn(schemaModel, model, sortBy.field);
            query = query.orderBy(
              sortBy.direction === "desc" ? desc(column) : asc(column)
            );
          }
          if (typeof limit === "number") query = query.limit(limit);
          if (typeof offset === "number") query = query.offset(offset);
          const rows = await query;
          return rows.map((row: Record<string, any>) =>
            decryptJwksPrivateKey(model, row)
          );
        },

        async count({ model, where }) {
          const schemaModel = getSchemaModel(model);
          const clauses = convertWhere(model, where);
          let query = connection.select({ value: count() }).from(schemaModel);
          if (clauses.length) query = query.where(...clauses);
          const rows = await query;
          return Number(rows[0]?.value ?? 0);
        },

        async update({ model, where, update }) {
          const schemaModel = getSchemaModel(model);
          const id = where.find(
            (condition) =>
              condition.field === "id" &&
              (condition.operator === "eq" || condition.operator === undefined) &&
              typeof condition.value === "string"
          )?.value as string | undefined;
          const values = encryptJwksPrivateKey(
            model,
            scopeData(model, update, "update"),
            id
          );
          await assertApplicationWriteAllowed(model, values, "update");
          const rows = await connection
            .update(schemaModel)
            .set(values)
            .where(...convertWhere(model, where))
            .returning();
          return decryptJwksPrivateKey(model, rows[0] ?? null);
        },

        async updateMany({ model, where, update }) {
          const schemaModel = getSchemaModel(model);
          if (isApplicationJwksModel(model) && update.privateKey !== undefined) {
            throw new BetterAuthError(
              "Bulk application JWKS private key updates are forbidden"
            );
          }
          const idColumn = getColumn(schemaModel, model, "id");
          const values = scopeData(model, update, "update");
          await assertApplicationWriteAllowed(model, values, "update");
          const rows = await connection
            .update(schemaModel)
            .set(values)
            .where(...convertWhere(model, where))
            .returning({ id: idColumn });
          return rows.length;
        },

        async delete({ model, where }) {
          const schemaModel = getSchemaModel(model);
          const sessions = await prepareApplicationSessionDeletion(model, where);
          await connection
            .delete(schemaModel)
            .where(...convertWhere(model, where));
          await publishSessionInvalidations(sessions);
        },

        async deleteMany({ model, where }) {
          const schemaModel = getSchemaModel(model);
          const idColumn = getColumn(schemaModel, model, "id");
          const sessions = await prepareApplicationSessionDeletion(model, where);
          const rows = await connection
            .delete(schemaModel)
            .where(...convertWhere(model, where))
            .returning({ id: idColumn });
          await publishSessionInvalidations(sessions);
          return rows.length;
        },

        async consumeOne({ model, where }) {
          const schemaModel = getSchemaModel(model);
          const idColumn = getColumn(schemaModel, model, "id");
          const sessions = await prepareApplicationSessionDeletion(model, where);
          const target = connection
            .select({ id: idColumn })
            .from(schemaModel)
            .where(...convertWhere(model, where))
            .limit(1);
          const rows = await connection
            .delete(schemaModel)
            .where(inArray(idColumn, target))
            .returning();
          await publishSessionInvalidations(sessions);
          return decryptJwksPrivateKey(model, rows[0] ?? null);
        },

        async incrementOne({ model, where, increment, set }) {
          const schemaModel = getSchemaModel(model);
          const idColumn = getColumn(schemaModel, model, "id");
          const assignments: Record<string, unknown> = {};

          for (const [field, delta] of Object.entries(increment)) {
            const fieldName = getFieldName({ model, field });
            const column = getColumn(schemaModel, model, field);
            assignments[fieldName] = sql`${column} + ${delta}`;
          }

          const scopedSet = scopeData(model, set ?? {}, "update");
          await assertApplicationWriteAllowed(model, scopedSet, "update");
          Object.assign(assignments, scopedSet);

          const target = connection
            .select({ id: idColumn })
            .from(schemaModel)
            .where(...convertWhere(model, where))
            .limit(1);
          const rows = await connection
            .update(schemaModel)
            .set(assignments)
            .where(inArray(idColumn, target))
            .returning();
          return decryptJwksPrivateKey(model, rows[0] ?? null);
        },

        options: {
          adapterId: "shopana-scoped-drizzle",
        },
      };

      return adapter;
    };
}

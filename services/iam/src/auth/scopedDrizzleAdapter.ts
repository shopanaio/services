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
  applicationJwks,
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

type DrizzleConnection = any;
type AuthModelName = keyof typeof platformAuthSchema;

const platformAuthSchema = {
  user,
  session,
  account,
  verification,
  jwks,
};

const applicationAuthSchema: Record<AuthModelName, unknown> = {
  user: applicationUser,
  session: applicationSession,
  account: applicationAccount,
  verification: applicationVerification,
  jwks: applicationJwks,
};

const APPLICATION_SCOPED_MODELS = new Set<AuthModelName>([
  "user",
  "account",
  "session",
  "verification",
  "jwks",
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
  scope: AuthAdapterScope
): DBAdapterInstance<BetterAuthOptions> {
  if (scope.kind === "application") {
    assertApplicationId(scope.applicationId);
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

  const createCustomAdapter = createScopedCustomAdapter(scope);
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
  scope: AuthAdapterScope
): (connection: DrizzleConnection) => AdapterFactoryCustomizeAdapterCreator {
  return (connection) =>
    ({ getDefaultModelName, getFieldName }): CustomAdapter => {
      const schema =
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

      const scopeData = (
        model: string,
        data: unknown
      ): Record<string, any> => {
        const record = data as Record<string, any>;
        if (!isScopedModel(model)) return record;

        return {
          ...record,
          applicationId:
            scope.kind === "application" ? scope.applicationId : null,
        };
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
          .where(
            and(
              eq(application.id, scope.applicationId),
              isNull(application.deletedAt),
              isNull(organization.deletedAt)
            )
          );
        const conditions = [
          eq(schemaModel.applicationId, scope.applicationId),
          inArray(schemaModel.applicationId, activeApplicationIds),
        ];

        if (isApplicationUserModel(model)) {
          conditions.push(eq(schemaModel.status, "active"));
        }

        return conditions;
      };

      const assertApplicationWriteAllowed = async (
        model: string,
        values: Record<string, any>
      ): Promise<void> => {
        if (!isScopedModel(model) || scope.kind !== "application") return;

        const [activeApplication] = await connection
          .select({ id: application.id })
          .from(application)
          .innerJoin(
            organization,
            eq(organization.id, application.organizationId)
          )
          .where(
            and(
              eq(application.id, scope.applicationId),
              isNull(application.deletedAt),
              isNull(organization.deletedAt)
            )
          )
          .limit(1);
        if (!activeApplication) {
          throw new BetterAuthError("Application auth realm is not active");
        }

        const defaultModel = getDefaultModelName(model) as AuthModelName;
        if (
          (defaultModel === "account" || defaultModel === "session") &&
          typeof values.userId === "string"
        ) {
          const [activeUser] = await connection
            .select({ id: applicationUser.id })
            .from(applicationUser)
            .where(
              and(
                eq(applicationUser.applicationId, scope.applicationId),
                eq(applicationUser.id, values.userId),
                eq(applicationUser.status, "active")
              )
            )
            .limit(1);
          if (!activeUser) {
            throw new BetterAuthError(
              "Application account or session requires an active user"
            );
          }
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
        return fields.reduce<Record<string, any>>((selection, field) => {
          const fieldName = getFieldName({ model, field });
          selection[fieldName] = getColumn(schemaModel, model, field);
          return selection;
        }, {});
      };

      const ensureNoNativeJoin = (join: unknown): void => {
        if (join && Object.keys(join as object).length > 0) {
          throw new BetterAuthError(
            "Native joins are disabled for Shopana scoped auth"
          );
        }
      };

      const adapter: CustomAdapter = {
        async create({ model, data }) {
          const schemaModel = getSchemaModel(model);
          const values = scopeData(model, data);
          await assertApplicationWriteAllowed(model, values);
          const rows = await connection
            .insert(schemaModel)
            .values(values)
            .returning();
          const created = rows[0];
          if (!created) {
            throw new BetterAuthError(`Failed to create auth model "${model}"`);
          }
          return created;
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
          return rows[0] ?? null;
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
          return query;
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
          const rows = await connection
            .update(schemaModel)
            .set(scopeData(model, update))
            .where(...convertWhere(model, where))
            .returning();
          return rows[0] ?? null;
        },

        async updateMany({ model, where, update }) {
          const schemaModel = getSchemaModel(model);
          const idColumn = getColumn(schemaModel, model, "id");
          const rows = await connection
            .update(schemaModel)
            .set(scopeData(model, update))
            .where(...convertWhere(model, where))
            .returning({ id: idColumn });
          return rows.length;
        },

        async delete({ model, where }) {
          const schemaModel = getSchemaModel(model);
          await connection
            .delete(schemaModel)
            .where(...convertWhere(model, where));
        },

        async deleteMany({ model, where }) {
          const schemaModel = getSchemaModel(model);
          const idColumn = getColumn(schemaModel, model, "id");
          const rows = await connection
            .delete(schemaModel)
            .where(...convertWhere(model, where))
            .returning({ id: idColumn });
          return rows.length;
        },

        async consumeOne({ model, where }) {
          const schemaModel = getSchemaModel(model);
          const idColumn = getColumn(schemaModel, model, "id");
          const target = connection
            .select({ id: idColumn })
            .from(schemaModel)
            .where(...convertWhere(model, where))
            .limit(1);
          const rows = await connection
            .delete(schemaModel)
            .where(inArray(idColumn, target))
            .returning();
          return rows[0] ?? null;
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

          const scopedSet = scopeData(model, set ?? {});
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
          return rows[0] ?? null;
        },

        options: {
          adapterId: "shopana-scoped-drizzle",
        },
      };

      return adapter;
    };
}

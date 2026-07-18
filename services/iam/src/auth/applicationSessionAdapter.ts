import type {
  BetterAuthOptions,
  DBAdapter,
  DBAdapterInstance,
  DBTransactionAdapter,
  Where,
} from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import type { Database } from "../infrastructure/db/database.js";
import {
  account,
  jwks,
  session,
  user,
  verification,
} from "../repositories/models/index.js";

type Adapter = DBAdapter<BetterAuthOptions>;
type TransactionAdapter = DBTransactionAdapter<BetterAuthOptions>;
type AdapterLike = Adapter | TransactionAdapter;

type CreateArgs = Parameters<Adapter["create"]>[0];
type FindOneArgs = Parameters<Adapter["findOne"]>[0];
type FindManyArgs = Parameters<Adapter["findMany"]>[0];
type CountArgs = Parameters<Adapter["count"]>[0];
type UpdateArgs = Parameters<Adapter["update"]>[0];
type UpdateManyArgs = Parameters<Adapter["updateMany"]>[0];
type DeleteArgs = Parameters<Adapter["delete"]>[0];
type DeleteManyArgs = Parameters<Adapter["deleteMany"]>[0];
type ConsumeOneArgs = Parameters<Adapter["consumeOne"]>[0];
type IncrementOneArgs = Parameters<Adapter["incrementOne"]>[0];

const SESSION_MODEL = "session";

/**
 * Wrap the standard Better Auth adapter so every session operation is scoped
 * to exactly one IAM application. User identities and accounts stay global.
 */
export function createApplicationSessionAdapter(
  db: Database,
  applicationId: string
): DBAdapterInstance<BetterAuthOptions> {
  if (!applicationId) {
    throw new Error("Application ID is required for application auth");
  }

  const createDrizzleAdapter = drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user,
      session,
      account,
      verification,
      jwks,
    },
  });

  return (options) =>
    withApplicationSessionScope(
      createDrizzleAdapter(options),
      applicationId
    );
}

function withApplicationSessionScope<T extends AdapterLike>(
  adapter: T,
  applicationId: string
): T {
  const scoped = {
    ...adapter,

    create: ((args: CreateArgs) =>
      adapter.create(scopeCreate(args, applicationId))) as Adapter["create"],

    findOne: ((args: FindOneArgs) =>
      adapter.findOne({
        ...args,
        where: scopeWhere(args.model, args.where, applicationId) ?? [],
      })) as Adapter["findOne"],

    findMany: ((args: FindManyArgs) =>
      adapter.findMany({
        ...args,
        where: scopeWhere(args.model, args.where, applicationId),
      })) as Adapter["findMany"],

    count: ((args: CountArgs) =>
      adapter.count({
        ...args,
        where: scopeWhere(args.model, args.where, applicationId),
      })) as Adapter["count"],

    update: ((args: UpdateArgs) =>
      adapter.update({
        ...args,
        where: scopeWhere(args.model, args.where, applicationId) ?? [],
        update: scopeUpdate(args.model, args.update, applicationId),
      })) as Adapter["update"],

    updateMany: ((args: UpdateManyArgs) =>
      adapter.updateMany({
        ...args,
        where: scopeWhere(args.model, args.where, applicationId) ?? [],
        update: scopeUpdate(args.model, args.update, applicationId),
      })) as Adapter["updateMany"],

    delete: ((args: DeleteArgs) =>
      adapter.delete({
        ...args,
        where: scopeWhere(args.model, args.where, applicationId) ?? [],
      })) as Adapter["delete"],

    deleteMany: ((args: DeleteManyArgs) =>
      adapter.deleteMany({
        ...args,
        where: scopeWhere(args.model, args.where, applicationId) ?? [],
      })) as Adapter["deleteMany"],

    consumeOne: ((args: ConsumeOneArgs) =>
      adapter.consumeOne({
        ...args,
        where: scopeWhere(args.model, args.where, applicationId) ?? [],
      })) as Adapter["consumeOne"],

    incrementOne: ((args: IncrementOneArgs) =>
      adapter.incrementOne({
        ...args,
        where: scopeWhere(args.model, args.where, applicationId) ?? [],
      })) as Adapter["incrementOne"],
  } as T;

  if ("transaction" in adapter) {
    const transactionalAdapter = adapter as Adapter;
    (scoped as Adapter).transaction = (callback) =>
      transactionalAdapter.transaction((transaction) =>
        callback(
          withApplicationSessionScope(transaction, applicationId)
        )
      );
  }

  return scoped;
}

function scopeCreate(
  args: CreateArgs,
  applicationId: string
): CreateArgs {
  if (args.model !== SESSION_MODEL) return args;

  return {
    ...args,
    data: {
      ...args.data,
      scope: "application",
      applicationId,
    },
  };
}

function scopeUpdate(
  model: string,
  update: Record<string, unknown>,
  applicationId: string
): Record<string, unknown> {
  if (model !== SESSION_MODEL) return update;

  return {
    ...update,
    scope: "application",
    applicationId,
  };
}

function scopeWhere(
  model: string,
  where: Where[] | undefined,
  applicationId: string
): Where[] | undefined {
  if (model !== SESSION_MODEL) return where;

  return [
    ...(where ?? []),
    {
      field: "scope",
      value: "application",
      connector: "AND",
    },
    {
      field: "applicationId",
      value: applicationId,
      connector: "AND",
    },
  ];
}

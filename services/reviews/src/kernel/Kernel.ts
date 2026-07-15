import { createCache, type Cache } from "cache-manager";
import { Kernel as BaseKernel, consoleLogger } from "@shopana/shared-kernel";
import type {
  DatabaseClient,
  Logger,
  ServiceBroker,
  WorkflowRegistry,
} from "@shopana/shared-kernel";
import {
  getContextSafe,
  runWithContext,
  ServiceContext,
} from "../context/index.js";
import { createDatabase, type Database } from "../infrastructure/db/database.js";
import { Loader } from "../loaders/Loader.js";
import { Repository } from "../repositories/Repository.js";
import { BaseScript } from "./BaseScript.js";
import type { ReviewsKernelServices, RunScriptContext } from "./types.js";

export class Kernel extends BaseKernel<ReviewsKernelServices> {
  private static instance: Kernel | null = null;

  public repository!: Repository;
  public cache!: Cache;
  public db!: Database;
  public workflow!: WorkflowRegistry;

  private constructor(
    broker: ServiceBroker,
    logger: Logger,
    repository: Repository,
    workflow: WorkflowRegistry,
    cache: Cache,
    db: Database
  ) {
    super(broker, logger, { repository, workflow, cache });
    this.repository = repository;
    this.workflow = workflow;
    this.cache = cache;
    this.db = db;
  }

  static async create(
    broker: ServiceBroker,
    workflow: WorkflowRegistry,
    dbClient: DatabaseClient
  ): Promise<Kernel> {
    if (this.instance) {
      return this.instance;
    }

    const db = createDatabase(dbClient);
    const repository = await Repository.create({ db });
    const cache = createCache({ ttl: 5 * 60 * 1000 });

    this.instance = new Kernel(
      broker,
      consoleLogger,
      repository,
      workflow,
      cache,
      db
    );
    return this.instance;
  }

  static getInstance(): Kernel {
    if (!this.instance) {
      throw new Error(
        "Kernel not initialized. Call Kernel.create(broker, workflow, dbClient) first."
      );
    }
    return this.instance;
  }

  static isInitialized(): boolean {
    return this.instance !== null;
  }

  async close(): Promise<void> {
    Kernel.instance = null;
  }

  async runScript<TParams, TResult>(
    ScriptClass: new (
      services: ReviewsKernelServices
    ) => BaseScript<TParams, TResult>,
    params: TParams,
    context?: RunScriptContext
  ): Promise<TResult> {
    const script = new ScriptClass(this.services);

    if (context && !getContextSafe()) {
      const serviceContext = this.buildServiceContext(context);
      return runWithContext(serviceContext, () => script.run(params));
    }

    return script.run(params);
  }

  private buildServiceContext(ctx: RunScriptContext): ServiceContext {
    const defaultLocale = ctx.defaultLocale ?? ctx.locale ?? "";
    const defaultCurrency = ctx.defaultCurrency ?? ctx.currencies?.[0] ?? "";

    return new ServiceContext({
      requestId: ctx.requestId ?? `workflow-${Date.now()}`,
      kernel: this,
      loaders: new Loader(this.repository),
      locale: ctx.locale,
      store: {
        id: ctx.storeId,
        name: ctx.storeId,
        displayName: ctx.storeId,
        organizationId: ctx.organizationId,
        timezone: "UTC",
        email: null,
        defaultLocale,
        defaultCurrency,
        locales: ctx.locales ?? [defaultLocale],
        currencies: ctx.currencies ?? (defaultCurrency ? [defaultCurrency] : []),
      },
      user: ctx.userId
        ? { id: ctx.userId, name: "workflow-user" }
        : undefined,
    });
  }
}

export type {
  ReviewsKernelServices,
  RunScriptContext,
  ScriptContext,
  TransactionScript,
} from "./types.js";
export { BaseScript, type UserError } from "./BaseScript.js";
export { KernelError } from "./types.js";

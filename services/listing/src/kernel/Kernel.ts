import { createCache, type Cache } from "cache-manager";
import { Kernel as BaseKernel, consoleLogger } from "@shopana/shared-kernel";
import type {
  DatabaseClient,
  Logger,
  ServiceBroker,
  WorkflowRegistry,
} from "@shopana/shared-kernel";
import { getContextSafe, runWithContext, ServiceContext } from "../context/index.js";
import { createDatabase, type Database } from "../infrastructure/db/database.js";
import { Loader } from "../loaders/Loader.js";
import { Repository } from "../repositories/Repository.js";
import { SearchExecutionService } from "../search/execution/index.js";
import { SearchConfigurationService } from "../search/configuration/index.js";
import { BaseScript } from "./BaseScript.js";
import type { ListingKernelServices, RunScriptContext } from "./types.js";

export class Kernel extends BaseKernel<ListingKernelServices> {
  private static instance: Kernel | null = null;

  public repository!: Repository;
  public cache!: Cache;
  public db!: Database;
  public workflow!: WorkflowRegistry;
  public searchExecution!: SearchExecutionService;

  private constructor(
    broker: ServiceBroker,
    logger: Logger,
    repository: Repository,
    workflow: WorkflowRegistry,
    cache: Cache,
    db: Database,
    searchExecution: SearchExecutionService,
  ) {
    super(broker, logger, { repository, workflow, cache, searchExecution });
    this.repository = repository;
    this.workflow = workflow;
    this.cache = cache;
    this.db = db;
    this.searchExecution = searchExecution;
  }

  static async create(
    broker: ServiceBroker,
    workflow: WorkflowRegistry,
    dbClient: DatabaseClient,
  ): Promise<Kernel> {
    if (this.instance) {
      return this.instance;
    }

    const db = createDatabase(dbClient);
    const repository = await Repository.create({
      db,
      broker,
      heavyOptionFacetCountsEnabled: booleanEnv("LISTING_HEAVY_OPTION_FACET_COUNTS_ENABLED"),
      facetCountsProfilingEnabled: booleanEnv("LISTING_FACET_COUNTS_PROFILE_ENABLED"),
    });
    const cache = createCache({
      ttl: 5 * 60 * 1000,
    });
    const searchConfiguration = new SearchConfigurationService(
      cache,
      repository.searchSynonym,
      repository.searchProductBoost,
    );
    const searchExecution = new SearchExecutionService({
      connection: () => repository.db,
      settings: repository.searchSettings,
      configuration: searchConfiguration,
    });

    this.instance = new Kernel(
      broker,
      consoleLogger,
      repository,
      workflow,
      cache,
      db,
      searchExecution,
    );
    return this.instance;
  }

  static getInstance(): Kernel {
    if (!this.instance) {
      throw new Error(
        "Kernel not initialized. Call Kernel.create(broker, workflow, dbClient) first.",
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
    ScriptClass: new (services: ListingKernelServices) => BaseScript<TParams, TResult>,
    params: TParams,
    context?: RunScriptContext,
  ): Promise<TResult> {
    const script = new ScriptClass(this.services);

    if (context && !getContextSafe()) {
      const serviceContext = this.buildServiceContext(context);
      return runWithContext(serviceContext, () => script.run(params));
    }

    return script.run(params);
  }

  private buildServiceContext(ctx: RunScriptContext): ServiceContext {
    const defaultLocale = this.resolveDefaultLocale(ctx);
    const defaultCurrency = this.resolveDefaultCurrency(ctx);
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
        currencyCode: defaultCurrency,
        locales: ctx.locales ?? [defaultLocale],
      },
      user: ctx.userId ? { id: ctx.userId, name: "workflow-user" } : undefined,
    });
  }

  private resolveDefaultLocale(ctx: RunScriptContext): string {
    return ctx.defaultLocale ?? ctx.locale ?? "";
  }

  private resolveDefaultCurrency(ctx: RunScriptContext): string {
    return ctx.defaultCurrency ?? ctx.currencies?.[0] ?? "";
  }
}

function booleanEnv(name: string): boolean | undefined {
  const value = process.env[name];
  if (value === undefined) {
    return undefined;
  }

  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

export type {
  ListingKernelServices,
  RunScriptContext,
  ScriptContext,
  TransactionScript,
} from "./types.js";
export { BaseScript, type UserError } from "./BaseScript.js";
export { KernelError } from "./types.js";

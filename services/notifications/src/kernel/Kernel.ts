import { createCache, type Cache } from "cache-manager";
import {
  Kernel as BaseKernel,
  consoleLogger,
  type DatabaseClient,
  type Logger,
  type ServiceBroker,
  type WorkflowRegistry,
} from "@shopana/shared-kernel";
import {
  getContextSafe,
  runWithContext,
  ServiceContext,
} from "../context/index.js";
import { createDatabase, type Database } from "../infrastructure/db/database.js";
import { DataProtectionService } from "../infrastructure/secrets/DataProtectionService.js";
import { NotificationTemplateRenderer } from "../infrastructure/templates/NotificationTemplateRenderer.js";
import { TemplateDefinitionRegistry } from "../infrastructure/templates/TemplateDefinitionRegistry.js";
import { Loader } from "../loaders/Loader.js";
import { Repository } from "../repositories/Repository.js";
import { BaseScript } from "./BaseScript.js";
import type {
  NotificationKernelServices,
  RunScriptContext,
} from "./types.js";

export class Kernel extends BaseKernel<NotificationKernelServices> {
  private static instance: Kernel | null = null;

  readonly repository: Repository;
  readonly cache: Cache;
  readonly workflow: WorkflowRegistry;
  readonly definitions: TemplateDefinitionRegistry;
  readonly renderer: NotificationTemplateRenderer;
  readonly db: Database;

  private constructor(
    broker: ServiceBroker,
    logger: Logger,
    repository: Repository,
    workflow: WorkflowRegistry,
    cache: Cache,
    definitions: TemplateDefinitionRegistry,
    renderer: NotificationTemplateRenderer,
    db: Database
  ) {
    super(broker, logger, {
      repository,
      workflow,
      cache,
      definitions,
      renderer,
    });
    this.repository = repository;
    this.workflow = workflow;
    this.cache = cache;
    this.definitions = definitions;
    this.renderer = renderer;
    this.db = db;
  }

  static create(
    broker: ServiceBroker,
    workflow: WorkflowRegistry,
    dbClient: DatabaseClient,
    masterKey: string
  ): Kernel {
    if (this.instance) return this.instance;
    const db = createDatabase(dbClient);
    const protection = new DataProtectionService(masterKey);
    const repository = Repository.create({ db, protection });
    const cache = createCache({ ttl: 5 * 60 * 1_000 });
    const definitions = new TemplateDefinitionRegistry();
    const renderer = new NotificationTemplateRenderer(
      definitions,
      repository.templates
    );
    this.instance = new Kernel(
      broker,
      consoleLogger,
      repository,
      workflow,
      cache,
      definitions,
      renderer,
      db
    );
    return this.instance;
  }

  static getInstance(): Kernel {
    if (!this.instance) throw new Error("Notifications kernel is not initialized");
    return this.instance;
  }

  static isInitialized(): boolean {
    return this.instance !== null;
  }

  async close(): Promise<void> {
    await this.cache.clear();
    Kernel.instance = null;
  }

  async runScript<TParams, TResult>(
    ScriptClass: new (
      services: NotificationKernelServices
    ) => BaseScript<TParams, TResult>,
    params: TParams,
    context?: RunScriptContext
  ): Promise<TResult> {
    const script = new ScriptClass(this.services);
    if (context && !getContextSafe()) {
      const serviceContext = new ServiceContext({
        requestId: context.requestId ?? `workflow-${Date.now()}`,
        kernel: this,
        loaders: new Loader(this.repository, this.renderer),
        locale: context.locale,
        store: {
          id: context.storeId,
          name: context.storeId,
          displayName: context.displayName ?? context.storeId,
          organizationId: context.organizationId,
          timezone: context.timezone ?? "UTC",
          email: null,
          defaultLocale: context.defaultLocale ?? context.locale ?? "en",
          currencyCode: "",
          locales: [context.defaultLocale ?? context.locale ?? "en"],
        },
        user: context.userId
          ? { id: context.userId, name: "notification-workflow-user" }
          : undefined,
      });
      return runWithContext(serviceContext, () => script.run(params));
    }
    return script.run(params);
  }
}

export type {
  NotificationKernelServices,
  RunScriptContext,
} from "./types.js";

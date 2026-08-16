import { createCache, type Cache } from "cache-manager";
import {
  consoleLogger,
  Kernel as BaseKernel,
  type DatabaseClient,
  type Logger,
  type ServiceBroker,
  type WorkflowRegistry,
} from "@shopana/shared-kernel";
import {
  createDatabase,
  type Database,
} from "../infrastructure/db/database.js";
import { Repository } from "../repositories/Repository.js";
import type { LoyaltyKernelServices } from "./types.js";

export class Kernel extends BaseKernel<LoyaltyKernelServices> {
  private static instance: Kernel | null = null;

  readonly repository: Repository;
  readonly workflow: WorkflowRegistry;
  readonly cache: Cache;
  readonly db: Database;

  private constructor(
    broker: ServiceBroker,
    logger: Logger,
    repository: Repository,
    workflow: WorkflowRegistry,
    cache: Cache,
    db: Database,
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
    dbClient: DatabaseClient,
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
      db,
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
}

export type { LoyaltyKernelServices } from "./types.js";

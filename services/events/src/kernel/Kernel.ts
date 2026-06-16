import { Kernel as BaseKernel, consoleLogger } from "@shopana/shared-kernel";
import type { ServiceBroker, Logger, DatabaseClient } from "@shopana/shared-kernel";
import type { WorkflowRegistry } from "@shopana/shared-kernel";
import type { EventsKernelServices } from "./types.js";
import { Repository } from "../repositories/Repository.js";
import { createDatabase, type Database } from "../infrastructure/db/database.js";

export class Kernel extends BaseKernel<EventsKernelServices> {
  private static instance: Kernel | null = null;

  public repository!: Repository;
  public workflow!: WorkflowRegistry;
  public db!: Database;

  private constructor(
    broker: ServiceBroker,
    logger: Logger,
    repository: Repository,
    workflow: WorkflowRegistry,
    db: Database
  ) {
    super(broker, logger, { repository, workflow });
    this.repository = repository;
    this.workflow = workflow;
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

    this.instance = new Kernel(broker, consoleLogger, repository, workflow, db);
    return this.instance;
  }

  static getInstance(): Kernel {
    if (!this.instance) {
      throw new Error("Kernel not initialized. Call Kernel.create() first.");
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

export type { EventsKernelServices, ScriptContext, TransactionScript } from "./types.js";
export { KernelError } from "./types.js";

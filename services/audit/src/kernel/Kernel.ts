import {
  Kernel as BaseKernel,
  consoleLogger,
  type DatabaseClient,
  type Logger,
  type ServiceBroker,
  type WorkflowRegistry,
} from "@shopana/shared-kernel";
import { createDatabase, type Database } from "../infrastructure/db/database.js";
import { Repository } from "../repositories/Repository.js";
import type { AuditKernelServices } from "./types.js";

export class Kernel extends BaseKernel<AuditKernelServices> {
  private static instance: Kernel | null = null;

  readonly repository: Repository;
  readonly workflow: WorkflowRegistry;
  readonly db: Database;

  private constructor(
    broker: ServiceBroker,
    logger: Logger,
    repository: Repository,
    workflow: WorkflowRegistry,
    db: Database,
  ) {
    super(broker, logger, { repository, workflow });
    this.repository = repository;
    this.workflow = workflow;
    this.db = db;
  }

  static create(
    broker: ServiceBroker,
    workflow: WorkflowRegistry,
    dbClient: DatabaseClient,
  ): Kernel {
    if (this.instance) return this.instance;

    const db = createDatabase(dbClient);
    const repository = Repository.create(db);
    this.instance = new Kernel(broker, consoleLogger, repository, workflow, db);
    return this.instance;
  }

  static getInstance(): Kernel {
    if (!this.instance) throw new Error("Audit kernel is not initialized");
    return this.instance;
  }

  async close(): Promise<void> {
    Kernel.instance = null;
  }
}

export type { AuditKernelServices, ScriptContext, TransactionScript } from "./types.js";

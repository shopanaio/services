import { TransactionManager } from "@shopana/shared-kernel";
import type { Database } from "../infrastructure/db/database.js";
import { AuditEntryRepository } from "./AuditEntryRepository.js";

export class Repository {
  readonly txManager: TransactionManager<Database>;
  readonly entries: AuditEntryRepository;

  private constructor(db: Database, txManager: TransactionManager<Database>) {
    this.txManager = txManager;
    this.entries = new AuditEntryRepository(db, txManager);
  }

  static create(db: Database): Repository {
    return new Repository(db, new TransactionManager(db));
  }
}

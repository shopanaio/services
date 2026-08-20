import { TransactionManager } from "@shopana/shared-kernel";
import { createSmtpDatabase, type SmtpDatabase } from "./database.js";
import { SmtpConnectionRepository } from "./SmtpConnectionRepository.js";

export class SmtpRepository {
  readonly connection: SmtpConnectionRepository;
  readonly txManager: TransactionManager<SmtpDatabase>;

  private constructor(database: SmtpDatabase) {
    this.txManager = new TransactionManager(database);
    this.connection = new SmtpConnectionRepository(database, this.txManager);
  }

  static create(databaseClient: unknown): SmtpRepository {
    return new SmtpRepository(createSmtpDatabase(databaseClient));
  }

  runInTransaction<TResult>(callback: () => Promise<TResult>): Promise<TResult> {
    return this.txManager.run(callback);
  }
}

import { TransactionManager } from "@shopana/shared-kernel";
import { initDatabase, closeDatabaseConnection, type Database } from "../infrastructure/db/database";
import { UserRepository } from "./user/UserRepository.js";

export class Repository {
  public readonly user: UserRepository;

  private readonly db: Database;

  /** Transaction Manager — used by Kernel to wrap scripts in transactions */
  public readonly txManager: TransactionManager<Database>;

  constructor(connectionString: string) {
    this.db = initDatabase(connectionString);
    this.txManager = new TransactionManager(this.db);

    this.user = new UserRepository(this.db, this.txManager);
  }

  async close(): Promise<void> {
    await closeDatabaseConnection();
  }
}

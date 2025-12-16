import { TransactionManager } from "@shopana/shared-kernel";
import { initDatabase, closeDatabaseConnection, type Database } from "../infrastructure/db/database";
import { CustomerRepository } from "./customer/CustomerRepository.js";

export class Repository {
  public readonly customer: CustomerRepository;

  private readonly db: Database;

  /** Transaction Manager — used by Kernel to wrap scripts in transactions */
  public readonly txManager: TransactionManager<Database>;

  constructor(connectionString: string) {
    this.db = initDatabase(connectionString);
    this.txManager = new TransactionManager(this.db);

    this.customer = new CustomerRepository(this.db, this.txManager);
  }

  async close(): Promise<void> {
    await closeDatabaseConnection();
  }
}

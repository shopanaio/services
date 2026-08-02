import { TransactionManager } from "@shopana/shared-kernel";
import type { Database } from "../infrastructure/db/database.js";
import { ProviderAccountRepository } from "./ProviderAccountRepository.js";
import { ProfileRepository } from "./ProfileRepository.js";
import { CheckoutOptionBindingRepository } from "./CheckoutOptionBindingRepository.js";
import { ProviderRateCacheRepository } from "./ProviderRateCacheRepository.js";
import { CustomizationBindingRepository } from "./CustomizationBindingRepository.js";
import { sql } from "drizzle-orm";

export class Repository {
  readonly providerAccounts: ProviderAccountRepository;
  readonly profiles: ProfileRepository;
  readonly optionBindings: CheckoutOptionBindingRepository;
  readonly rateCache: ProviderRateCacheRepository;
  readonly customizationBindings: CustomizationBindingRepository;
  readonly txManager: TransactionManager<Database>;

  private constructor(db: Database) {
    this.txManager = new TransactionManager(db);
    this.providerAccounts = new ProviderAccountRepository(db, this.txManager);
    this.profiles = new ProfileRepository(db, this.txManager);
    this.optionBindings = new CheckoutOptionBindingRepository(db, this.txManager);
    this.rateCache = new ProviderRateCacheRepository(db, this.txManager);
    this.customizationBindings = new CustomizationBindingRepository(db, this.txManager);
  }

  static create(db: Database): Repository { return new Repository(db); }

  async generateUuidV7(): Promise<string> {
    const rows = await this.txManager.getConnection().execute<{ id: string }>(sql`SELECT uuidv7() AS id`);
    const id = rows[0]?.id;
    if (!id) throw new Error("PostgreSQL uuidv7() did not return an id");
    return id;
  }
}

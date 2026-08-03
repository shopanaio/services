import { TransactionManager } from "@shopana/shared-kernel";
import {
  createOnlineStoreDatabase,
  type OnlineStoreDatabase,
} from "./database.js";
import { NavigationMenuItemRepository } from "./NavigationMenuItemRepository.js";
import { NavigationMenuRepository } from "./NavigationMenuRepository.js";
import { PageRepository } from "./PageRepository.js";
import { TranslationRepository } from "./TranslationRepository.js";

export class OnlineStoreRepository {
  readonly page: PageRepository;
  readonly navigationMenu: NavigationMenuRepository;
  readonly navigationMenuItem: NavigationMenuItemRepository;
  readonly translation: TranslationRepository;
  readonly txManager: TransactionManager<OnlineStoreDatabase>;

  get db(): OnlineStoreDatabase {
    return this.txManager.getConnection() as OnlineStoreDatabase;
  }

  private constructor(database: OnlineStoreDatabase) {
    this.txManager = new TransactionManager(database);
    this.page = new PageRepository(database, this.txManager);
    this.navigationMenu = new NavigationMenuRepository(
      database,
      this.txManager,
    );
    this.navigationMenuItem = new NavigationMenuItemRepository(
      database,
      this.txManager,
    );
    this.translation = new TranslationRepository(database, this.txManager);
  }

  static create(databaseClient: unknown): OnlineStoreRepository {
    return new OnlineStoreRepository(createOnlineStoreDatabase(databaseClient));
  }

  runInTransaction<TResult>(
    callback: () => Promise<TResult>,
  ): Promise<TResult> {
    return this.txManager.run(callback);
  }
}

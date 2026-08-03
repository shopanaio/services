import type { TransactionManager } from "@shopana/shared-kernel";
import {
  and,
  eq,
  exists,
  isNull,
  sql,
  type SQLWrapper,
} from "drizzle-orm";
import type { OnlineStoreDatabase } from "./database.js";
import {
  appInstallationsReference,
  navigationMenuItems,
  navigationMenus,
  pages,
} from "./models/index.js";
import type { OnlineStoreScope } from "./types.js";

const ONLINE_STORE_APP_CODE = "shopana-online-store";

export abstract class BaseRepository {
  constructor(
    protected readonly db: OnlineStoreDatabase,
    protected readonly txManager: TransactionManager<OnlineStoreDatabase>,
  ) {}

  protected get connection(): OnlineStoreDatabase {
    return this.txManager.getConnection() as OnlineStoreDatabase;
  }

  protected async assertInstallationScope(
    scope: OnlineStoreScope,
  ): Promise<void> {
    const rows = await this.connection
      .select({ id: appInstallationsReference.id })
      .from(appInstallationsReference)
      .where(
        and(
          eq(appInstallationsReference.id, scope.installationId),
          eq(appInstallationsReference.storeId, scope.storeId),
          eq(appInstallationsReference.appCode, ONLINE_STORE_APP_CODE),
        ),
      )
      .limit(1);

    if (!rows[0]) {
      throw new Error(
        `Online Store installation "${scope.installationId}" does not belong to store "${scope.storeId}"`,
      );
    }
  }

  protected pageScope(scope: OnlineStoreScope) {
    return and(
      eq(pages.installationId, scope.installationId),
      eq(pages.storeId, scope.storeId),
      isNull(pages.deletedAt),
    );
  }

  protected pageOwnership(scope: OnlineStoreScope, pageId: string) {
    return and(this.pageScope(scope), eq(pages.id, pageId));
  }

  protected ownedPageExists(
    scope: OnlineStoreScope,
    pageId: string | SQLWrapper,
  ) {
    return exists(
      this.connection
        .select({ id: pages.id })
        .from(pages)
        .where(and(this.pageScope(scope), sql`${pages.id} = ${pageId}`)),
    );
  }

  protected menuScope(scope: OnlineStoreScope) {
    return and(
      eq(navigationMenus.installationId, scope.installationId),
      eq(navigationMenus.storeId, scope.storeId),
      isNull(navigationMenus.deletedAt),
    );
  }

  protected menuOwnership(scope: OnlineStoreScope, menuId: string) {
    return and(this.menuScope(scope), eq(navigationMenus.id, menuId));
  }

  protected ownedMenuExists(
    scope: OnlineStoreScope,
    menuId: string | SQLWrapper,
  ) {
    return exists(
      this.connection
        .select({ id: navigationMenus.id })
        .from(navigationMenus)
        .where(
          and(
            this.menuScope(scope),
            sql`${navigationMenus.id} = ${menuId}`,
          ),
        ),
    );
  }

  protected itemScope(scope: OnlineStoreScope) {
    return and(
      eq(navigationMenuItems.storeId, scope.storeId),
      this.ownedMenuExists(scope, navigationMenuItems.menuId),
    );
  }

  protected itemOwnership(scope: OnlineStoreScope, itemId: string) {
    return and(this.itemScope(scope), eq(navigationMenuItems.id, itemId));
  }

  protected ownedItemExists(
    scope: OnlineStoreScope,
    itemId: string | SQLWrapper,
  ) {
    return exists(
      this.connection
        .select({ id: navigationMenuItems.id })
        .from(navigationMenuItems)
        .where(
          and(
            this.itemScope(scope),
            sql`${navigationMenuItems.id} = ${itemId}`,
          ),
        ),
    );
  }
}

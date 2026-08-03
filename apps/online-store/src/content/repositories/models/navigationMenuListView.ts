import { onlineStoreSchema } from "./schema.js";
import { navigationMenus } from "./navigation.js";

export const navigationMenuListView = onlineStoreSchema
  .view("navigation_menu_list_view")
  .as((qb) =>
    qb
      .select({
        installationId: navigationMenus.installationId,
        storeId: navigationMenus.storeId,
        id: navigationMenus.id,
        handle: navigationMenus.handle,
        name: navigationMenus.name,
        revision: navigationMenus.revision,
        createdAt: navigationMenus.createdAt,
        updatedAt: navigationMenus.updatedAt,
        deletedAt: navigationMenus.deletedAt,
      })
      .from(navigationMenus),
  );

export type NavigationMenuListView = typeof navigationMenuListView.$inferSelect;

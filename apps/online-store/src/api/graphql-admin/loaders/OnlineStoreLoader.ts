import DataLoader from "dataloader";
import type {
  NavigationMenuItemRecord,
  NavigationMenuItemTranslationRecord,
  NavigationMenuRecord,
  OnlineStoreRepository,
  OnlineStoreScope,
  PageRecord,
  PageTranslationRecord,
} from "../../../content/repositories/index.js";

export class OnlineStoreLoader {
  readonly page: DataLoader<string, PageRecord | null>;
  readonly pageTranslation: DataLoader<string, PageTranslationRecord | null>;
  readonly navigationMenu: DataLoader<string, NavigationMenuRecord | null>;
  readonly navigationMenuItem: DataLoader<
    string,
    NavigationMenuItemRecord | null
  >;
  readonly navigationMenuItemTranslation: DataLoader<
    string,
    NavigationMenuItemTranslationRecord | null
  >;

  constructor(
    repository: OnlineStoreRepository,
    scope: OnlineStoreScope,
    locale: string,
  ) {
    this.page = new DataLoader(async (ids: readonly string[]) => {
      const records = await repository.page.getByIds(scope, ids);
      return ids.map((id) => records.find((record) => record.id === id) ?? null);
    });
    this.pageTranslation = new DataLoader(async (ids: readonly string[]) => {
      const records = await repository.translation.getPageTranslations(
        scope,
        ids,
        locale,
      );
      return ids.map(
        (id) => records.find((record) => record.pageId === id) ?? null,
      );
    });
    this.navigationMenu = new DataLoader(async (ids: readonly string[]) => {
      const records = await repository.navigationMenu.getByIds(scope, ids);
      return ids.map((id) => records.find((record) => record.id === id) ?? null);
    });
    this.navigationMenuItem = new DataLoader(async (ids: readonly string[]) => {
      const records = await repository.navigationMenuItem.getByIds(scope, ids);
      return ids.map((id) => records.find((record) => record.id === id) ?? null);
    });
    this.navigationMenuItemTranslation = new DataLoader(
      async (ids: readonly string[]) => {
        const records =
          await repository.translation.getMenuItemTranslations(
            scope,
            ids,
            locale,
          );
        return ids.map(
          (id) => records.find((record) => record.itemId === id) ?? null,
        );
      },
    );
  }
}

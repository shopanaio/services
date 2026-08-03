import type {
  NavigationMenuItemModel,
  NavigationMenuItemTranslationModel,
  NavigationMenuModel,
  PageModel,
  PageTranslationModel,
} from "./models/index.js";

export interface OnlineStoreScope {
  readonly installationId: string;
  readonly storeId: string;
}

export type PageRecord = Readonly<PageModel>;
export type PageTranslationRecord = Readonly<PageTranslationModel>;
export type NavigationMenuRecord = Readonly<NavigationMenuModel>;
export type NavigationMenuItemRecord = Readonly<NavigationMenuItemModel>;
export type NavigationMenuItemTranslationRecord =
  Readonly<NavigationMenuItemTranslationModel>;

export type NavigationItemTarget =
  | Readonly<{ type: "URL"; url: string }>
  | Readonly<{ type: string; id: string }>;

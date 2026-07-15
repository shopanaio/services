export type NavigationStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";

export type NavigationLinkType = "PRODUCT" | "CATEGORY" | "PAGE" | "LINK";

export interface NavigationEntryOption {
  id: string;
  title: string;
  slug: string;
}

export interface NavigationMenuItem {
  id: string;
  title: string;
  parentId: string | null;
  slug: string;
  sortIndex: number;
  type: NavigationLinkType;
  entry: NavigationEntryOption | null;
  children: NavigationMenuItem[];
  collapsed?: boolean;
}

export interface NavigationMenu {
  id: string;
  title: string;
  slug: string;
  status: NavigationStatus;
  items: NavigationMenuItem[];
  createdAt: string;
  updatedAt: string;
}

export interface NavigationMenuFormValues {
  title: string;
  slug: string;
  status: NavigationStatus;
  menuItems: NavigationMenuItem[];
}

export interface NavigationLinkFormValues {
  id: string | null;
  menuId: string;
  title: string;
  slug: string;
  type: NavigationLinkType | null;
  entry: NavigationEntryOption | null;
  parentId: string | null;
  sortIndex: number;
  children: NavigationMenuItem[];
}

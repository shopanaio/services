import type { ApiHeadlessStorefrontPermissionDefinition } from "@/graphql/types";

export const CREATE_STOREFRONT_MODAL_ID = "storefront.create";
export const RENAME_STOREFRONT_MODAL_ID = "storefront.rename";
export const DISCONNECT_STOREFRONT_MODAL_ID = "storefront.disconnect";

export interface CreateStorefrontModalPayload {
  permissionCatalog: ApiHeadlessStorefrontPermissionDefinition[];
  defaultPermissions: string[];
}

export interface CreateStorefrontModalResult {
  storefrontId: string;
  privateAccessToken: string | null;
}

export interface RenameStorefrontModalPayload {
  storefrontId: string;
  displayName: string;
}

export interface RenameStorefrontModalResult {
  displayName: string;
}

export interface DisconnectStorefrontModalPayload {
  storefrontId: string;
  displayName: string;
}

export interface DisconnectStorefrontModalResult {
  storefrontId: string;
}

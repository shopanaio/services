export const RENAME_STOREFRONT_MODAL_ID = "storefront.rename";
export const DISCONNECT_STOREFRONT_MODAL_ID = "storefront.disconnect";

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

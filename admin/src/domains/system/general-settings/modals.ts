import type { ApiStore } from "@/graphql/types";
import { createModalStackHook } from "@/layouts/modals";
import type { IModalStackPayload } from "@/layouts/modals/types";
import type { StoreSettingsSection } from "./types";

export type { StoreSettingsSection } from "./types";

export const EDIT_STORE_SETTINGS_MODAL_TYPE =
  "general-settings-edit-store-settings";
export const EDIT_STORE_DEFAULTS_MODAL_TYPE =
  "general-settings-edit-store-defaults";

export interface EditStoreSettingsModalPayload extends IModalStackPayload {
  section: StoreSettingsSection;
  store: ApiStore;
  onSaved?: () => Promise<unknown> | unknown;
}

export const useEditStoreSettingsModal = createModalStackHook(
  EDIT_STORE_SETTINGS_MODAL_TYPE,
);

export interface EditStoreDefaultsModalPayload extends IModalStackPayload {
  store: ApiStore;
  onSaved?: () => Promise<unknown> | unknown;
}

export const useEditStoreDefaultsModal = createModalStackHook(
  EDIT_STORE_DEFAULTS_MODAL_TYPE,
);

declare module "@/layouts/modals" {
  interface ModalStackPayloads {
    [EDIT_STORE_SETTINGS_MODAL_TYPE]: EditStoreSettingsModalPayload;
    [EDIT_STORE_DEFAULTS_MODAL_TYPE]: EditStoreDefaultsModalPayload;
  }
}

import type {
  ApiCustomerAccountsSettings,
  ApiCustomerAccountsSettingsUpdateInput,
  ApiGenericUserError,
  ApiStore,
} from "@/graphql/types";
import { createModalStackHook } from "@/layouts/modals";
import type { IModalStackPayload } from "@/layouts/modals/types";
import type { StoreSettingsSection } from "./types";

export type { StoreSettingsSection } from "./types";

export const EDIT_STORE_SETTINGS_MODAL_TYPE = "general-settings-edit-store-settings";
export const EDIT_STORE_DEFAULTS_MODAL_TYPE = "general-settings-edit-store-defaults";
export const EDIT_STORE_CURRENCY_MODAL_TYPE = "general-settings-edit-store-currency";
export const ADD_STORE_LANGUAGE_MODAL_TYPE = "general-settings-add-store-language";
export const EDIT_CUSTOMER_ACCOUNTS_MODAL_TYPE = "general-settings-edit-customer-accounts";
export const EDIT_STORE_ORDER_PROCESSING_MODAL_TYPE =
  "general-settings-edit-store-order-processing";

export interface EditStoreSettingsModalPayload extends IModalStackPayload {
  section: StoreSettingsSection;
  store: ApiStore;
  onSaved?: () => Promise<unknown> | unknown;
}

export const useEditStoreSettingsModal = createModalStackHook(EDIT_STORE_SETTINGS_MODAL_TYPE);

export interface EditStoreDefaultsModalPayload extends IModalStackPayload {
  store: ApiStore;
  onSaved?: () => Promise<unknown> | unknown;
}

export const useEditStoreDefaultsModal = createModalStackHook(EDIT_STORE_DEFAULTS_MODAL_TYPE);

export interface EditStoreCurrencyModalPayload extends IModalStackPayload {
  store: ApiStore;
  onSaved?: () => Promise<unknown> | unknown;
}

export const useEditStoreCurrencyModal = createModalStackHook(EDIT_STORE_CURRENCY_MODAL_TYPE);

export interface AddStoreLanguageModalPayload extends IModalStackPayload {
  store: ApiStore;
  onSaved?: () => Promise<unknown> | unknown;
}

export const useAddStoreLanguageModal = createModalStackHook(ADD_STORE_LANGUAGE_MODAL_TYPE);

export interface EditCustomerAccountsModalPayload extends IModalStackPayload {
  settings: ApiCustomerAccountsSettings;
  onSave: (input: ApiCustomerAccountsSettingsUpdateInput) => Promise<ApiGenericUserError[]>;
}

export const useEditCustomerAccountsModal = createModalStackHook(EDIT_CUSTOMER_ACCOUNTS_MODAL_TYPE);

export interface EditStoreOrderProcessingModalPayload extends IModalStackPayload {
  store: ApiStore;
  onSaved?: () => Promise<unknown> | unknown;
}

export const useEditStoreOrderProcessingModal = createModalStackHook(
  EDIT_STORE_ORDER_PROCESSING_MODAL_TYPE,
);

declare module "@/layouts/modals" {
  interface ModalStackPayloads {
    [EDIT_STORE_SETTINGS_MODAL_TYPE]: EditStoreSettingsModalPayload;
    [EDIT_STORE_DEFAULTS_MODAL_TYPE]: EditStoreDefaultsModalPayload;
    [EDIT_STORE_CURRENCY_MODAL_TYPE]: EditStoreCurrencyModalPayload;
    [ADD_STORE_LANGUAGE_MODAL_TYPE]: AddStoreLanguageModalPayload;
    [EDIT_CUSTOMER_ACCOUNTS_MODAL_TYPE]: EditCustomerAccountsModalPayload;
    [EDIT_STORE_ORDER_PROCESSING_MODAL_TYPE]: EditStoreOrderProcessingModalPayload;
  }
}

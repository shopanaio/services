import type { LocaleCode } from "@/graphql/types";
import { createModalStackHook } from "@/layouts/modals";
import type { IModalStackPayload } from "@/layouts/modals/types";

export const EDIT_STORE_INFORMATION_MODAL_TYPE =
  "general-settings-edit-store-information";
export const ADD_LANGUAGE_MODAL_TYPE = "general-settings-add-language";
export const LOCALE_ACTION_MODAL_TYPE = "general-settings-locale-action";
export const DELETE_STORE_MODAL_TYPE = "general-settings-delete-store";

interface GeneralSettingsModalPayload extends IModalStackPayload {
  onSaved?: () => Promise<unknown> | unknown;
}

export interface EditStoreInformationModalPayload
  extends GeneralSettingsModalPayload {
  storeId: string;
  expectedRevision: number;
  organizationId: string;
  storeName: string;
  displayName: string;
  email: string | null;
  phoneNumbers: string[];
}

export type AddLanguageModalPayload = GeneralSettingsModalPayload;

export interface LocaleActionModalPayload
  extends GeneralSettingsModalPayload {
  action: "delete" | "set-default";
  localeCode: LocaleCode;
  localeName: string;
}

export interface DeleteStoreModalPayload extends GeneralSettingsModalPayload {
  storeId: string;
  organizationId: string;
  storeName: string;
}

export const useEditStoreInformationModal = createModalStackHook(
  EDIT_STORE_INFORMATION_MODAL_TYPE,
);
export const useAddLanguageModal = createModalStackHook(ADD_LANGUAGE_MODAL_TYPE);
export const useLocaleActionModal = createModalStackHook(
  LOCALE_ACTION_MODAL_TYPE,
);
export const useDeleteStoreModal = createModalStackHook(DELETE_STORE_MODAL_TYPE);

declare module "@/layouts/modals" {
  interface ModalStackPayloads {
    [EDIT_STORE_INFORMATION_MODAL_TYPE]: EditStoreInformationModalPayload;
    [ADD_LANGUAGE_MODAL_TYPE]: AddLanguageModalPayload;
    [LOCALE_ACTION_MODAL_TYPE]: LocaleActionModalPayload;
    [DELETE_STORE_MODAL_TYPE]: DeleteStoreModalPayload;
  }
}

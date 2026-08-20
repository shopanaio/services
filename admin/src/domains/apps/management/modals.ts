import { createModalStackHook } from "@/layouts/modals";
import type { IModalStackPayload } from "@/layouts/modals/types";

export const APP_MANAGEMENT_MODAL_TYPE = "app-management";

export interface AppManagementModalPayload extends IModalStackPayload {
  appCode: string;
}

declare module "@/layouts/modals" {
  interface ModalStackPayloads {
    [APP_MANAGEMENT_MODAL_TYPE]: AppManagementModalPayload;
  }
}

export const useAppManagementModal = createModalStackHook(APP_MANAGEMENT_MODAL_TYPE);

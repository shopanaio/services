import { createModalStackHook } from "@/layouts/modals";
import type { IModalStackPayload } from "@/layouts/modals/types";

export const UNINSTALL_APP_MODAL_TYPE = "system-uninstall-app";

export interface UninstallAppModalPayload extends IModalStackPayload {
  appCode: string;
  appName: string;
  onSaved?: () => Promise<unknown> | unknown;
}

export const useUninstallAppModal = createModalStackHook(UNINSTALL_APP_MODAL_TYPE);

declare module "@/layouts/modals" {
  interface ModalStackPayloads {
    [UNINSTALL_APP_MODAL_TYPE]: UninstallAppModalPayload;
  }
}

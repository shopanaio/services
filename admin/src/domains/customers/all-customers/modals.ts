import { createModalStackHook } from "@/layouts/modals";
import type { IModalStackPayload } from "@/layouts/modals/types";

export const CUSTOMER_MODAL_TYPE = "customer";

export interface CustomerModalPayload extends IModalStackPayload {
  mode: "create" | "edit";
  entityId?: string;
  onSaved?: () => Promise<unknown> | unknown;
}

declare module "@/layouts/modals" {
  interface ModalStackPayloads {
    [CUSTOMER_MODAL_TYPE]: CustomerModalPayload;
  }
}

export const useCustomerModal = createModalStackHook(CUSTOMER_MODAL_TYPE);

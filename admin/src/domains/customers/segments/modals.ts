import { createModalStackHook } from "@/layouts/modals";
import type { IModalStackPayload } from "@/layouts/modals/types";

export const CUSTOMER_SEGMENT_MODAL_TYPE = "customer-segment";

export interface CustomerSegmentModalPayload extends IModalStackPayload {
  mode: "create" | "edit";
  entityId?: string;
  onSaved?: () => Promise<unknown> | unknown;
}

declare module "@/layouts/modals" {
  interface ModalStackPayloads {
    [CUSTOMER_SEGMENT_MODAL_TYPE]: CustomerSegmentModalPayload;
  }
}

export const useCustomerSegmentModal = createModalStackHook(CUSTOMER_SEGMENT_MODAL_TYPE);

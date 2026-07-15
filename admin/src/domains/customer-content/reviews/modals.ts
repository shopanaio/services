import { createModalStackHook } from "@/layouts/modals";
import type { IModalStackPayload } from "@/layouts/modals/types";

export const REVIEW_MODAL_TYPE = "customer-review";

export interface ReviewModalPayload extends IModalStackPayload {
  mode: "create" | "edit";
  entityId?: string;
  onSaved?: () => Promise<unknown> | unknown;
}

declare module "@/layouts/modals" {
  interface ModalStackPayloads {
    [REVIEW_MODAL_TYPE]: ReviewModalPayload;
  }
}

export const useReviewModal = createModalStackHook(REVIEW_MODAL_TYPE);

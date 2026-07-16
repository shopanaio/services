import { createModalStackHook } from "@/layouts/modals";
import type { IModalStackPayload } from "@/layouts/modals/types";

export const REVIEW_MODAL_TYPE = "customer-review";
export const REVIEW_CREATE_MODAL_TYPE = "customer-review-create";
export const REVIEW_EDIT_MODAL_TYPE = "customer-review-edit";

export interface ReviewModalPayload extends IModalStackPayload {
  entityId: string;
  onSaved?: () => Promise<unknown> | unknown;
}

export interface ReviewCreateModalPayload extends IModalStackPayload {
  onSaved?: () => Promise<unknown> | unknown;
}

export type ReviewEditSection = "content" | "moderation" | "trust" | "media";

export interface ReviewEditModalPayload extends IModalStackPayload {
  entityId: string;
  section?: ReviewEditSection;
  onSaved?: () => Promise<unknown> | unknown;
}

declare module "@/layouts/modals" {
  interface ModalStackPayloads {
    [REVIEW_MODAL_TYPE]: ReviewModalPayload;
    [REVIEW_CREATE_MODAL_TYPE]: ReviewCreateModalPayload;
    [REVIEW_EDIT_MODAL_TYPE]: ReviewEditModalPayload;
  }
}

export const useReviewModal = createModalStackHook(REVIEW_MODAL_TYPE);
export const useReviewCreateModal = createModalStackHook(REVIEW_CREATE_MODAL_TYPE);
export const useReviewEditModal = createModalStackHook(REVIEW_EDIT_MODAL_TYPE);

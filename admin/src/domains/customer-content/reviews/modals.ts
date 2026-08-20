"use client";

import { useCallback } from "react";
import { createModalStackHook, useModalStack } from "@/layouts/modals";
import type { IModalStackPayload } from "@/layouts/modals/types";
import type { ApiFile } from "@/graphql/types";
import { ReviewContentStatus } from "@/graphql/types";

export const REVIEW_MODAL_TYPE = "customer-review";
export const REVIEW_CREATE_MODAL_TYPE = "customer-review-create";
export const REVIEW_EDIT_CONTENT_MODAL_TYPE = "customer-review-edit-content";
export const REVIEW_EDIT_REVIEWER_MODAL_TYPE = "customer-review-edit-reviewer";
export const REVIEW_EDIT_SUBJECT_MODAL_TYPE = "customer-review-edit-subject";
export const REVIEW_EDIT_RATINGS_MODAL_TYPE = "customer-review-edit-ratings";
export const REVIEW_EDIT_MODERATION_MODAL_TYPE = "customer-review-edit-moderation";
export const REVIEW_EDIT_VERIFICATION_MODAL_TYPE = "customer-review-edit-verification";
export const REVIEW_EDIT_INCENTIVE_MODAL_TYPE = "customer-review-edit-incentive";
export const REVIEW_EDIT_MEDIA_MODAL_TYPE = "customer-review-edit-media";
export const REVIEW_EDIT_MEDIA_ITEM_MODAL_TYPE = "customer-review-edit-media-item";
export const REVIEW_TECHNICAL_METADATA_MODAL_TYPE = "customer-review-technical-metadata";

export interface ReviewModalPayload extends IModalStackPayload {
  entityId: string;
  onSaved?: () => Promise<unknown> | unknown;
}

export interface ReviewCreateModalPayload extends IModalStackPayload {
  onSaved?: () => Promise<unknown> | unknown;
}

export type ReviewEditSection =
  | "content"
  | "reviewer"
  | "subject"
  | "ratings"
  | "moderation"
  | "verification"
  | "incentive"
  | "media";

export interface ReviewEditModalPayload extends ReviewModalPayload {
  section: ReviewEditSection;
  initialMediaFileId?: string;
}

export interface ReviewSectionModalPayload extends ReviewModalPayload {
  initialMediaFileId?: string;
}

export interface ReviewMediaDraftItem {
  file: ApiFile;
  caption: string | null;
  status: ReviewContentStatus;
  moderationNote: string | null;
  moderatedByPrincipalId: string | null;
  moderatedAt: string | null;
  moderationDirty: boolean;
}

export interface ReviewMediaItemModalPayload extends IModalStackPayload {
  item: ReviewMediaDraftItem;
  onApply: (item: ReviewMediaDraftItem) => void;
}

const editModalTypeBySection: Record<ReviewEditSection, string> = {
  content: REVIEW_EDIT_CONTENT_MODAL_TYPE,
  reviewer: REVIEW_EDIT_REVIEWER_MODAL_TYPE,
  subject: REVIEW_EDIT_SUBJECT_MODAL_TYPE,
  ratings: REVIEW_EDIT_RATINGS_MODAL_TYPE,
  moderation: REVIEW_EDIT_MODERATION_MODAL_TYPE,
  verification: REVIEW_EDIT_VERIFICATION_MODAL_TYPE,
  incentive: REVIEW_EDIT_INCENTIVE_MODAL_TYPE,
  media: REVIEW_EDIT_MEDIA_MODAL_TYPE,
};

declare module "@/layouts/modals" {
  interface ModalStackPayloads {
    [REVIEW_MODAL_TYPE]: ReviewModalPayload;
    [REVIEW_CREATE_MODAL_TYPE]: ReviewCreateModalPayload;
    [REVIEW_EDIT_CONTENT_MODAL_TYPE]: ReviewSectionModalPayload;
    [REVIEW_EDIT_REVIEWER_MODAL_TYPE]: ReviewSectionModalPayload;
    [REVIEW_EDIT_SUBJECT_MODAL_TYPE]: ReviewSectionModalPayload;
    [REVIEW_EDIT_RATINGS_MODAL_TYPE]: ReviewSectionModalPayload;
    [REVIEW_EDIT_MODERATION_MODAL_TYPE]: ReviewSectionModalPayload;
    [REVIEW_EDIT_VERIFICATION_MODAL_TYPE]: ReviewSectionModalPayload;
    [REVIEW_EDIT_INCENTIVE_MODAL_TYPE]: ReviewSectionModalPayload;
    [REVIEW_EDIT_MEDIA_MODAL_TYPE]: ReviewSectionModalPayload;
    [REVIEW_EDIT_MEDIA_ITEM_MODAL_TYPE]: ReviewMediaItemModalPayload;
    [REVIEW_TECHNICAL_METADATA_MODAL_TYPE]: ReviewModalPayload;
  }
}

export const useReviewModal = createModalStackHook(REVIEW_MODAL_TYPE);
export const useReviewCreateModal = createModalStackHook(REVIEW_CREATE_MODAL_TYPE);
export const useReviewMediaItemModal = createModalStackHook(REVIEW_EDIT_MEDIA_ITEM_MODAL_TYPE);
export const useReviewTechnicalMetadataModal = createModalStackHook(
  REVIEW_TECHNICAL_METADATA_MODAL_TYPE,
);

export function useReviewEditModal() {
  const { push: pushToStack } = useModalStack();
  const push = useCallback(
    (payload: ReviewEditModalPayload) => {
      const { section, ...modalPayload } = payload;
      return pushToStack(editModalTypeBySection[section], modalPayload);
    },
    [pushToStack],
  );
  return { push };
}

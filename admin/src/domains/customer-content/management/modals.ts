import { createModalStackHook } from "@/layouts/modals";
import type { IModalStackPayload } from "@/layouts/modals/types";
import type { ExternalReference, ModerationCase, RatingCriterion, ReviewRequest } from "./types";
import type { ApiReviewContentExternalReference } from "@/graphql/types";

export const RATING_CRITERION_MODAL_TYPE = "review-rating-criterion";
export const MODERATION_CASE_MODAL_TYPE = "review-moderation-case";
export const REVIEW_REQUEST_MODAL_TYPE = "review-request";
export const EXTERNAL_REFERENCE_MODAL_TYPE = "review-external-reference";

interface SavedPayload extends IModalStackPayload { onSaved?: () => Promise<unknown> | unknown }
export interface RatingCriterionModalPayload extends SavedPayload { criterion?: RatingCriterion }
export interface ModerationCaseModalPayload extends SavedPayload { moderationCase?: ModerationCase; contentId?: string }
export interface ReviewRequestModalPayload extends SavedPayload { reviewRequest?: ReviewRequest }
export interface ExternalReferenceModalPayload extends SavedPayload {
  externalReference?: ExternalReference | ApiReviewContentExternalReference;
  contentId?: string;
  contentLabel?: string;
}

declare module "@/layouts/modals" {
  interface ModalStackPayloads {
    [RATING_CRITERION_MODAL_TYPE]: RatingCriterionModalPayload;
    [MODERATION_CASE_MODAL_TYPE]: ModerationCaseModalPayload;
    [REVIEW_REQUEST_MODAL_TYPE]: ReviewRequestModalPayload;
    [EXTERNAL_REFERENCE_MODAL_TYPE]: ExternalReferenceModalPayload;
  }
}

export const useRatingCriterionModal = createModalStackHook(RATING_CRITERION_MODAL_TYPE);
export const useModerationCaseModal = createModalStackHook(MODERATION_CASE_MODAL_TYPE);
export const useReviewRequestModal = createModalStackHook(REVIEW_REQUEST_MODAL_TYPE);
export const useExternalReferenceModal = createModalStackHook(EXTERNAL_REFERENCE_MODAL_TYPE);

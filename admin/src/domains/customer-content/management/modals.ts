import { createModalStackHook } from "@/layouts/modals";
import type { IModalStackPayload } from "@/layouts/modals/types";
import type { RatingCriterion } from "./types";
import type {
  ApiReviewContentExternalReference,
  ApiReviewModerationCase,
  ApiReviewRequest,
} from "@/graphql/types";

export const RATING_CRITERION_MODAL_TYPE = "review-rating-criterion";
export const MODERATION_CASE_MODAL_TYPE = "review-moderation-case";
export const REVIEW_REQUEST_MODAL_TYPE = "review-request";
export const EXTERNAL_REFERENCE_MODAL_TYPE = "review-external-reference";
export const PRODUCT_INSIGHTS_MODAL_TYPE = "product-insights";

interface SavedPayload extends IModalStackPayload {
  onSaved?: () => Promise<unknown> | unknown;
}
export interface RatingCriterionModalPayload extends SavedPayload {
  criterion?: RatingCriterion;
}
export interface ModerationCaseModalPayload extends SavedPayload {
  moderationCase?: ApiReviewModerationCase;
  contentId?: string;
}
export interface ReviewRequestModalPayload extends SavedPayload {
  reviewRequest?: ApiReviewRequest;
}
export interface ExternalReferenceModalPayload extends SavedPayload {
  externalReference?: ApiReviewContentExternalReference;
  contentId?: string;
  contentLabel?: string;
}
export interface ProductInsightsModalPayload extends IModalStackPayload {
  product: { id: string; title: string; handle: string };
}

declare module "@/layouts/modals" {
  interface ModalStackPayloads {
    [RATING_CRITERION_MODAL_TYPE]: RatingCriterionModalPayload;
    [MODERATION_CASE_MODAL_TYPE]: ModerationCaseModalPayload;
    [REVIEW_REQUEST_MODAL_TYPE]: ReviewRequestModalPayload;
    [EXTERNAL_REFERENCE_MODAL_TYPE]: ExternalReferenceModalPayload;
    [PRODUCT_INSIGHTS_MODAL_TYPE]: ProductInsightsModalPayload;
  }
}

export const useRatingCriterionModal = createModalStackHook(RATING_CRITERION_MODAL_TYPE);
export const useModerationCaseModal = createModalStackHook(MODERATION_CASE_MODAL_TYPE);
export const useReviewRequestModal = createModalStackHook(REVIEW_REQUEST_MODAL_TYPE);
export const useExternalReferenceModal = createModalStackHook(EXTERNAL_REFERENCE_MODAL_TYPE);
export const useProductInsightsModal = createModalStackHook(PRODUCT_INSIGHTS_MODAL_TYPE);

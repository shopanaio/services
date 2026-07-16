import type {
  ReviewModerationMode,
  ReviewDuplicatePolicy,
  ReviewRatingCriterionTargetType,
} from "@/graphql/types";

export interface ManagementUserError { code: string; field?: string[] | null; message: string }
export interface ReviewConfiguration {
  id: string; reviewsEnabled: boolean; questionsEnabled: boolean; guestReviewsEnabled: boolean; guestQuestionsEnabled: boolean;
  customerAnswersEnabled: boolean; verifiedPurchaseRequired: boolean; reviewModerationMode: ReviewModerationMode;
  questionModerationMode: ReviewModerationMode; answerModerationMode: ReviewModerationMode; reviewDuplicatePolicy: ReviewDuplicatePolicy;
  reviewRequestsEnabled: boolean; reviewRequestDelayDays: number; reviewRequestExpiryDays: number; reviewEditWindowHours: number;
  questionEditWindowHours: number; answerEditWindowHours: number; maxReviewMediaCount: number; maxAnswersPerQuestion: number;
  revision: number; createdAt: string; updatedAt: string;
}

export interface RatingCriterion {
  id: string; code: string; defaultTitle: string; defaultDescription?: string | null; weight: number; isRequired: boolean; isActive: boolean;
  appliesToAllProducts: boolean; sortIndex: number; createdAt: string; updatedAt: string; deletedAt?: string | null;
  translations: Array<{ locale: string; title: string; description?: string | null; createdAt: string; updatedAt: string }>;
  assignments: Array<{ id: string; targetType: ReviewRatingCriterionTargetType; targetId: string; isRequiredOverride?: boolean | null; sortIndexOverride?: number | null; createdAt: string; target: { id: string; title: string } }>;
}

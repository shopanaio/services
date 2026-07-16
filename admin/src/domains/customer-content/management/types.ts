import type {
  ProductQuestionSubscriptionStatus,
  ReviewContentReportReason,
  ReviewContentReportStatus,
  ReviewContentStatus,
  ReviewContentAuthorType,
  ReviewExternalSyncDirection,
  ReviewExternalSyncStatus,
  ReviewModerationCaseStatus,
  ReviewModerationMode,
  ReviewDuplicatePolicy,
  ReviewNotificationChannel,
  ReviewRequestStatus,
  ReviewRequestEventType,
  ReviewRatingCriterionTargetType,
} from "@/graphql/types";

export interface ManagementUserError { code: string; field?: string[] | null; message: string }
export interface ContentSummary {
  id: string; __typename?: string; title?: string | null; body: string; locale?: string; status: ReviewContentStatus;
  moderationNote?: string | null; revision?: number; redactedAt?: string | null; deletedAt?: string | null; createdAt?: string; updatedAt: string;
  author: { type?: ReviewContentAuthorType; displayName: string; email?: string | null; customer?: { id: string; displayName: string } | null };
  metrics?: { likeCount: number; dislikeCount: number; reportCount: number; childCount: number; mediaCount: number };
}

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

export interface ContentReport {
  id: string; reason: ReviewContentReportReason; details?: string | null; status: ReviewContentReportStatus; assignedToPrincipalId?: string | null;
  resolutionNote?: string | null; resolvedByPrincipalId?: string | null; resolvedAt?: string | null; createdAt: string; updatedAt: string;
  reporterCustomer?: { id: string; displayName: string; email?: string | null } | null; content: ContentSummary;
}

export interface ModerationCase {
  id: string; status: ReviewModerationCaseStatus; priority: number; reasonCode: string; assignedToPrincipalId?: string | null; dueAt?: string | null;
  resolutionCode?: string | null; resolutionNote?: string | null; resolvedByPrincipalId?: string | null; resolvedAt?: string | null;
  createdAt: string; updatedAt: string; content: ContentSummary;
}

export interface ReviewRequest {
  id: string; orderId: string; orderLineId: string; channel: ReviewNotificationChannel; status: ReviewRequestStatus; locale: string; sourceChannel: string;
  providerMessageId?: string | null; attemptCount: number; scheduledAt: string; sentAt?: string | null; deliveredAt?: string | null;
  openedAt?: string | null; submittedAt?: string | null; expiresAt?: string | null; lastError?: string | null; createdAt: string; updatedAt: string;
  customer: { id: string; displayName: string; email?: string | null }; product: { id: string; title: string };
  variant?: { id: string; title: string; sku?: string | null } | null; review?: { id: string; title?: string | null } | null;
  events: { totalCount: number; edges: Array<{ node: { id: string; type: ReviewRequestEventType; providerEventId?: string | null; metadata: unknown; occurredAt: string; createdAt: string } }> };
}

export interface ExternalReference {
  id: string; externalSystem: string; externalType: string; externalId: string; externalUrl?: string | null; direction: ReviewExternalSyncDirection;
  syncStatus: ReviewExternalSyncStatus; etag?: string | null; contentChecksum?: string | null; lastSyncedAt?: string | null; lastError?: string | null;
  metadata: unknown; createdAt: string; updatedAt: string; deletedAt?: string | null; content: ContentSummary;
}

export interface QuestionSubscription {
  id: string; status: ProductQuestionSubscriptionStatus; channel: ReviewNotificationChannel; locale: string; updatedAt: string;
}

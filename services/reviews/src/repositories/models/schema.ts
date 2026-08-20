import { customType, pgSchema } from "drizzle-orm/pg-core";
import { LOCALE_CODES } from "@shopana/shared-references";

export const reviewsSchema = pgSchema("reviews");

export const localeCodeEnum = reviewsSchema.enum(
  "locale_code",
  LOCALE_CODES as [string, ...string[]],
);

export const contentKindEnum = reviewsSchema.enum("content_kind", [
  "REVIEW",
  "REVIEW_REPLY",
  "PRODUCT_QUESTION",
  "QUESTION_ANSWER",
]);

export const contentStatusEnum = reviewsSchema.enum("content_status", [
  "PENDING",
  "PUBLISHED",
  "REJECTED",
]);

export const contentAuthorTypeEnum = reviewsSchema.enum("content_author_type", [
  "CUSTOMER",
  "GUEST",
  "SELLER",
  "STAFF",
  "SYSTEM",
  "EXTERNAL",
]);

export const moderationModeEnum = reviewsSchema.enum("moderation_mode", [
  "PREMODERATION",
  "POSTMODERATION",
  "AUTOMATED",
]);

export const reviewDuplicatePolicyEnum = reviewsSchema.enum("review_duplicate_policy", [
  "ONE_PER_PRODUCT",
  "ONE_PER_ORDER_LINE",
  "ALLOW_MULTIPLE",
]);

export const ratingCriterionTargetTypeEnum = reviewsSchema.enum("rating_criterion_target_type", [
  "PRODUCT",
  "CATEGORY",
]);

export const translationSourceEnum = reviewsSchema.enum("translation_source", [
  "HUMAN",
  "MACHINE",
  "IMPORT",
]);

export const publicationStatusEnum = reviewsSchema.enum("publication_status", [
  "DRAFT",
  "SCHEDULED",
  "PUBLISHED",
  "UNPUBLISHED",
  "FAILED",
]);

export const reviewVerificationStatusEnum = reviewsSchema.enum("review_verification_status", [
  "UNVERIFIED",
  "VERIFIED",
  "REVOKED",
]);

export const notificationChannelEnum = reviewsSchema.enum("notification_channel", [
  "EMAIL",
  "SMS",
  "PUSH",
  "IN_APP",
]);

export const reviewRequestStatusEnum = reviewsSchema.enum("review_request_status", [
  "SCHEDULED",
  "SENT",
  "DELIVERED",
  "OPENED",
  "SUBMITTED",
  "EXPIRED",
  "CANCELLED",
  "FAILED",
]);

export const reviewRequestEventTypeEnum = reviewsSchema.enum("review_request_event_type", [
  "SCHEDULED",
  "SENT",
  "DELIVERED",
  "OPENED",
  "CLICKED",
  "SUBMITTED",
  "BOUNCED",
  "COMPLAINED",
  "FAILED",
  "CANCELLED",
  "EXPIRED",
]);

export const subscriptionStatusEnum = reviewsSchema.enum("subscription_status", [
  "ACTIVE",
  "PAUSED",
  "UNSUBSCRIBED",
]);

export const contentVoteTypeEnum = reviewsSchema.enum("content_vote_type", ["LIKE", "DISLIKE"]);

export const reportReasonEnum = reviewsSchema.enum("report_reason", [
  "SPAM",
  "OFFENSIVE",
  "HARASSMENT",
  "HATE_SPEECH",
  "FRAUD_OR_SCAM",
  "PERSONAL_INFORMATION",
  "ILLEGAL_CONTENT",
  "INTELLECTUAL_PROPERTY",
  "CONFLICT_OF_INTEREST",
  "NOT_RELEVANT",
  "OTHER",
]);

export const reportStatusEnum = reviewsSchema.enum("report_status", [
  "OPEN",
  "UNDER_REVIEW",
  "ACTIONED",
  "DISMISSED",
]);

export const moderationCaseStatusEnum = reviewsSchema.enum("moderation_case_status", [
  "OPEN",
  "IN_REVIEW",
  "RESOLVED",
  "CANCELLED",
]);

export const moderationActionEnum = reviewsSchema.enum("moderation_action", [
  "SUBMITTED",
  "AUTO_FLAGGED",
  "ASSIGNED",
  "PUBLISHED",
  "REJECTED",
  "RESTORED",
  "EDITED",
  "REDACTED",
  "DELETED",
]);

export const moderationVerdictEnum = reviewsSchema.enum("moderation_verdict", [
  "PASS",
  "REVIEW",
  "BLOCK",
]);

export const externalSyncDirectionEnum = reviewsSchema.enum("external_sync_direction", [
  "IMPORT",
  "EXPORT",
  "BIDIRECTIONAL",
]);

export const externalSyncStatusEnum = reviewsSchema.enum("external_sync_status", [
  "PENDING",
  "SYNCED",
  "FAILED",
  "DISABLED",
]);

export const bytea = customType<{
  data: Uint8Array;
  driverData: Uint8Array;
}>({
  dataType() {
    return "bytea";
  },
});

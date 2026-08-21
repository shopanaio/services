import { z } from 'zod'
import { CountryCode, CurrencyCode, DimensionUnit, LocaleCode, ProductQuestionAnswerCreateInput, ProductQuestionAnswerSort, ProductQuestionAnswerUpdateInput, ProductQuestionCreateInput, ProductQuestionSort, ProductQuestionSubscriptionSetInput, ProductQuestionSubscriptionStatus, ProductQuestionUpdateInput, ReviewContentAuthorType, ReviewContentDeleteInput, ReviewContentEditInput, ReviewContentKind, ReviewContentReportCreateInput, ReviewContentReportReason, ReviewContentReportStatus, ReviewContentStatus, ReviewContentSubmissionInput, ReviewContentVoteRemoveInput, ReviewContentVoteSetInput, ReviewContentVoteType, ReviewCreateInput, ReviewDuplicatePolicy, ReviewExternalSyncDirection, ReviewExternalSyncStatus, ReviewMediaCreateInput, ReviewModerationAction, ReviewModerationCaseStatus, ReviewModerationMode, ReviewModerationVerdict, ReviewNotificationChannel, ReviewPublicationStatus, ReviewRatingCriterionTargetType, ReviewRatingValueInput, ReviewRequestEventType, ReviewRequestStatus, ReviewSort, ReviewSubmissionAuthorInput, ReviewTranslationSource, ReviewUpdateInput, ReviewVerificationStatus, WeightUnit } from './types.js'

type Properties<T> = Required<{
  [K in keyof T]: z.ZodType<T[K], any, T[K]>;
}>;

type definedNonNullAny = {};

export const isDefinedNonNullAny = (v: any): v is definedNonNullAny => v !== undefined && v !== null;

export const definedNonNullAnySchema = z.any().refine((v) => isDefinedNonNullAny(v));

export const CountryCodeSchema = z.nativeEnum(CountryCode);

export const CurrencyCodeSchema = z.nativeEnum(CurrencyCode);

export const DimensionUnitSchema = z.nativeEnum(DimensionUnit);

export const LocaleCodeSchema = z.nativeEnum(LocaleCode);

export const ProductQuestionAnswerSortSchema = z.nativeEnum(ProductQuestionAnswerSort);

export const ProductQuestionSortSchema = z.nativeEnum(ProductQuestionSort);

export const ProductQuestionSubscriptionStatusSchema = z.nativeEnum(ProductQuestionSubscriptionStatus);

export const ReviewContentAuthorTypeSchema = z.nativeEnum(ReviewContentAuthorType);

export const ReviewContentKindSchema = z.nativeEnum(ReviewContentKind);

export const ReviewContentReportReasonSchema = z.nativeEnum(ReviewContentReportReason);

export const ReviewContentReportStatusSchema = z.nativeEnum(ReviewContentReportStatus);

export const ReviewContentStatusSchema = z.nativeEnum(ReviewContentStatus);

export const ReviewContentVoteTypeSchema = z.nativeEnum(ReviewContentVoteType);

export const ReviewDuplicatePolicySchema = z.nativeEnum(ReviewDuplicatePolicy);

export const ReviewExternalSyncDirectionSchema = z.nativeEnum(ReviewExternalSyncDirection);

export const ReviewExternalSyncStatusSchema = z.nativeEnum(ReviewExternalSyncStatus);

export const ReviewModerationActionSchema = z.nativeEnum(ReviewModerationAction);

export const ReviewModerationCaseStatusSchema = z.nativeEnum(ReviewModerationCaseStatus);

export const ReviewModerationModeSchema = z.nativeEnum(ReviewModerationMode);

export const ReviewModerationVerdictSchema = z.nativeEnum(ReviewModerationVerdict);

export const ReviewNotificationChannelSchema = z.nativeEnum(ReviewNotificationChannel);

export const ReviewPublicationStatusSchema = z.nativeEnum(ReviewPublicationStatus);

export const ReviewRatingCriterionTargetTypeSchema = z.nativeEnum(ReviewRatingCriterionTargetType);

export const ReviewRequestEventTypeSchema = z.nativeEnum(ReviewRequestEventType);

export const ReviewRequestStatusSchema = z.nativeEnum(ReviewRequestStatus);

export const ReviewSortSchema = z.nativeEnum(ReviewSort);

export const ReviewTranslationSourceSchema = z.nativeEnum(ReviewTranslationSource);

export const ReviewVerificationStatusSchema = z.nativeEnum(ReviewVerificationStatus);

export const WeightUnitSchema = z.nativeEnum(WeightUnit);

export function ProductQuestionAnswerCreateInputSchema(): z.ZodObject<Properties<ProductQuestionAnswerCreateInput>> {
  return z.object({
    content: z.lazy(() => ReviewContentSubmissionInputSchema()),
    productQuestionId: z.string()
  })
}

export function ProductQuestionAnswerUpdateInputSchema(): z.ZodObject<Properties<ProductQuestionAnswerUpdateInput>> {
  return z.object({
    answerId: z.string(),
    content: z.lazy(() => ReviewContentEditInputSchema())
  })
}

export function ProductQuestionCreateInputSchema(): z.ZodObject<Properties<ProductQuestionCreateInput>> {
  return z.object({
    content: z.lazy(() => ReviewContentSubmissionInputSchema()),
    productId: z.string(),
    variantId: z.string().nullish()
  })
}

export function ProductQuestionSubscriptionSetInputSchema(): z.ZodObject<Properties<ProductQuestionSubscriptionSetInput>> {
  return z.object({
    channel: ReviewNotificationChannelSchema.default("EMAIL").nullish(),
    locale: LocaleCodeSchema.nullish(),
    productQuestionId: z.string(),
    subscribed: z.boolean()
  })
}

export function ProductQuestionUpdateInputSchema(): z.ZodObject<Properties<ProductQuestionUpdateInput>> {
  return z.object({
    content: z.lazy(() => ReviewContentEditInputSchema()),
    productQuestionId: z.string()
  })
}

export function ReviewContentDeleteInputSchema(): z.ZodObject<Properties<ReviewContentDeleteInput>> {
  return z.object({
    id: z.string()
  })
}

export function ReviewContentEditInputSchema(): z.ZodObject<Properties<ReviewContentEditInput>> {
  return z.object({
    body: z.string().nullish(),
    locale: LocaleCodeSchema.nullish(),
    title: z.string().nullish()
  })
}

export function ReviewContentReportCreateInputSchema(): z.ZodObject<Properties<ReviewContentReportCreateInput>> {
  return z.object({
    contentId: z.string(),
    details: z.string().nullish(),
    reason: ReviewContentReportReasonSchema
  })
}

export function ReviewContentSubmissionInputSchema(): z.ZodObject<Properties<ReviewContentSubmissionInput>> {
  return z.object({
    author: z.lazy(() => ReviewSubmissionAuthorInputSchema().nullish()),
    body: z.string(),
    idempotencyKey: z.string(),
    locale: LocaleCodeSchema.nullish()
  })
}

export function ReviewContentVoteRemoveInputSchema(): z.ZodObject<Properties<ReviewContentVoteRemoveInput>> {
  return z.object({
    contentId: z.string()
  })
}

export function ReviewContentVoteSetInputSchema(): z.ZodObject<Properties<ReviewContentVoteSetInput>> {
  return z.object({
    contentId: z.string(),
    type: ReviewContentVoteTypeSchema
  })
}

export function ReviewCreateInputSchema(): z.ZodObject<Properties<ReviewCreateInput>> {
  return z.object({
    content: z.lazy(() => ReviewContentSubmissionInputSchema()),
    media: z.array(z.lazy(() => ReviewMediaCreateInputSchema())).nullish(),
    orderId: z.string().nullish(),
    orderLineId: z.string().nullish(),
    productId: z.string(),
    rating: z.number(),
    ratings: z.array(z.lazy(() => ReviewRatingValueInputSchema())).nullish(),
    title: z.string().nullish(),
    variantId: z.string().nullish()
  })
}

export function ReviewMediaCreateInputSchema(): z.ZodObject<Properties<ReviewMediaCreateInput>> {
  return z.object({
    caption: z.string().nullish(),
    mediaId: z.string(),
    sortIndex: z.number().nullish()
  })
}

export function ReviewRatingValueInputSchema(): z.ZodObject<Properties<ReviewRatingValueInput>> {
  return z.object({
    criterionId: z.string(),
    value: z.number()
  })
}

export function ReviewSubmissionAuthorInputSchema(): z.ZodObject<Properties<ReviewSubmissionAuthorInput>> {
  return z.object({
    displayName: z.string(),
    email: z.string().email().nullish()
  })
}

export function ReviewUpdateInputSchema(): z.ZodObject<Properties<ReviewUpdateInput>> {
  return z.object({
    content: z.lazy(() => ReviewContentEditInputSchema().nullish()),
    media: z.array(z.lazy(() => ReviewMediaCreateInputSchema())).nullish(),
    rating: z.number().nullish(),
    ratings: z.array(z.lazy(() => ReviewRatingValueInputSchema())).nullish(),
    reviewId: z.string()
  })
}

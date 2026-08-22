import { z } from 'zod'
import { BooleanFilter, CurrencyCode, DateTimeFilter, DimensionUnit, FloatFilter, IdFilter, IntFilter, LocaleCode, PriceAdjustmentOperation, PriceAdjustmentValueType, ProductQuestionAnswerCreateOperationInput, ProductQuestionAnswerOperationAction, ProductQuestionAnswerOperationInput, ProductQuestionAnswerOrderByInput, ProductQuestionAnswerOrderField, ProductQuestionAnswerPropertiesUpdateInput, ProductQuestionAnswerState, ProductQuestionAnswerUpdateInput, ProductQuestionAnswerWhereInput, ProductQuestionAnswersUpdateInput, ProductQuestionCreateInput, ProductQuestionOrderByInput, ProductQuestionOrderField, ProductQuestionSubjectUpdateInput, ProductQuestionSubscriptionOperationAction, ProductQuestionSubscriptionStatus, ProductQuestionSubscriptionUpdateOperationInput, ProductQuestionSubscriptionUpdateValuesInput, ProductQuestionUpdateInput, ProductQuestionWhereInput, ReviewContentAuthorCreateInput, ReviewContentAuthorType, ReviewContentAuthorUpdateInput, ReviewContentConnectionMetaInput, ReviewContentCreateInput, ReviewContentDeleteInput, ReviewContentExternalReferenceCreateValuesInput, ReviewContentExternalReferenceIdentityInput, ReviewContentExternalReferenceOperationAction, ReviewContentExternalReferenceOperationInput, ReviewContentExternalReferenceOrderByInput, ReviewContentExternalReferenceOrderField, ReviewContentExternalReferenceSyncInput, ReviewContentExternalReferenceUpdateValuesInput, ReviewContentExternalReferenceWhereInput, ReviewContentKind, ReviewContentModerationInput, ReviewContentOrderByInput, ReviewContentOrderField, ReviewContentPublicationSyncInput, ReviewContentReportAssignmentInput, ReviewContentReportOrderByInput, ReviewContentReportOrderField, ReviewContentReportReason, ReviewContentReportResolutionInput, ReviewContentReportStatus, ReviewContentReportUpdateInput, ReviewContentReportWhereInput, ReviewContentSourceCreateInput, ReviewContentSourceUpdateInput, ReviewContentStatus, ReviewContentTextUpdateInput, ReviewContentTranslationSyncInput, ReviewContentUpdateInput, ReviewContentVoteType, ReviewContentWhereInput, ReviewCreateInput, ReviewDuplicatePolicy, ReviewExternalSyncDirection, ReviewExternalSyncStatus, ReviewIncentiveUpdateInput, ReviewMediaSyncItemInput, ReviewModerationAction, ReviewModerationCaseCreateInput, ReviewModerationCaseDetailsInput, ReviewModerationCaseOrderByInput, ReviewModerationCaseOrderField, ReviewModerationCaseResolutionInput, ReviewModerationCaseStatus, ReviewModerationCaseUpdateInput, ReviewModerationCaseWhereInput, ReviewModerationMode, ReviewModerationVerdict, ReviewNotificationChannel, ReviewOrderByInput, ReviewOrderField, ReviewPublicationStatus, ReviewRatingCriterionApplicabilityInput, ReviewRatingCriterionAssignmentInput, ReviewRatingCriterionCreateInput, ReviewRatingCriterionDefinitionInput, ReviewRatingCriterionDeleteInput, ReviewRatingCriterionOrderByInput, ReviewRatingCriterionOrderField, ReviewRatingCriterionTargetType, ReviewRatingCriterionTranslationInput, ReviewRatingCriterionUpdateInput, ReviewRatingCriterionWhereInput, ReviewRatingUpdateInput, ReviewRatingValueInput, ReviewRepliesUpdateInput, ReviewReplyCreateOperationInput, ReviewReplyOperationAction, ReviewReplyOperationInput, ReviewReplyOrderByInput, ReviewReplyOrderField, ReviewReplyPropertiesUpdateInput, ReviewReplyUpdateInput, ReviewReplyWhereInput, ReviewRequestCreateInput, ReviewRequestDeliveryUpdateInput, ReviewRequestEventType, ReviewRequestOrderByInput, ReviewRequestOrderField, ReviewRequestScheduleUpdateInput, ReviewRequestStatus, ReviewRequestTransitionAction, ReviewRequestTransitionInput, ReviewRequestUpdateInput, ReviewRequestWhereInput, ReviewStoreConfigurationUpdateInput, ReviewSubjectUpdateInput, ReviewTranslationSource, ReviewUpdateInput, ReviewVerificationStatus, ReviewVerificationUpdateInput, ReviewWhereInput, ReviewsOperationType, SortDirection, StringFilter, WeightUnit } from './types.js'

type Properties<T> = Required<{
  [K in keyof T]: z.ZodType<T[K], any, T[K]>;
}>;

type definedNonNullAny = {};

export const isDefinedNonNullAny = (v: any): v is definedNonNullAny => v !== undefined && v !== null;

export const definedNonNullAnySchema = z.any().refine((v) => isDefinedNonNullAny(v));

export const CurrencyCodeSchema = z.nativeEnum(CurrencyCode);

export const DimensionUnitSchema = z.nativeEnum(DimensionUnit);

export const LocaleCodeSchema = z.nativeEnum(LocaleCode);

export const PriceAdjustmentOperationSchema = z.nativeEnum(PriceAdjustmentOperation);

export const PriceAdjustmentValueTypeSchema = z.nativeEnum(PriceAdjustmentValueType);

export const ProductQuestionAnswerOperationActionSchema = z.nativeEnum(ProductQuestionAnswerOperationAction);

export const ProductQuestionAnswerOrderFieldSchema = z.nativeEnum(ProductQuestionAnswerOrderField);

export const ProductQuestionAnswerStateSchema = z.nativeEnum(ProductQuestionAnswerState);

export const ProductQuestionOrderFieldSchema = z.nativeEnum(ProductQuestionOrderField);

export const ProductQuestionSubscriptionOperationActionSchema = z.nativeEnum(ProductQuestionSubscriptionOperationAction);

export const ProductQuestionSubscriptionStatusSchema = z.nativeEnum(ProductQuestionSubscriptionStatus);

export const ReviewContentAuthorTypeSchema = z.nativeEnum(ReviewContentAuthorType);

export const ReviewContentExternalReferenceOperationActionSchema = z.nativeEnum(ReviewContentExternalReferenceOperationAction);

export const ReviewContentExternalReferenceOrderFieldSchema = z.nativeEnum(ReviewContentExternalReferenceOrderField);

export const ReviewContentKindSchema = z.nativeEnum(ReviewContentKind);

export const ReviewContentOrderFieldSchema = z.nativeEnum(ReviewContentOrderField);

export const ReviewContentReportOrderFieldSchema = z.nativeEnum(ReviewContentReportOrderField);

export const ReviewContentReportReasonSchema = z.nativeEnum(ReviewContentReportReason);

export const ReviewContentReportStatusSchema = z.nativeEnum(ReviewContentReportStatus);

export const ReviewContentStatusSchema = z.nativeEnum(ReviewContentStatus);

export const ReviewContentVoteTypeSchema = z.nativeEnum(ReviewContentVoteType);

export const ReviewDuplicatePolicySchema = z.nativeEnum(ReviewDuplicatePolicy);

export const ReviewExternalSyncDirectionSchema = z.nativeEnum(ReviewExternalSyncDirection);

export const ReviewExternalSyncStatusSchema = z.nativeEnum(ReviewExternalSyncStatus);

export const ReviewModerationActionSchema = z.nativeEnum(ReviewModerationAction);

export const ReviewModerationCaseOrderFieldSchema = z.nativeEnum(ReviewModerationCaseOrderField);

export const ReviewModerationCaseStatusSchema = z.nativeEnum(ReviewModerationCaseStatus);

export const ReviewModerationModeSchema = z.nativeEnum(ReviewModerationMode);

export const ReviewModerationVerdictSchema = z.nativeEnum(ReviewModerationVerdict);

export const ReviewNotificationChannelSchema = z.nativeEnum(ReviewNotificationChannel);

export const ReviewOrderFieldSchema = z.nativeEnum(ReviewOrderField);

export const ReviewPublicationStatusSchema = z.nativeEnum(ReviewPublicationStatus);

export const ReviewRatingCriterionOrderFieldSchema = z.nativeEnum(ReviewRatingCriterionOrderField);

export const ReviewRatingCriterionTargetTypeSchema = z.nativeEnum(ReviewRatingCriterionTargetType);

export const ReviewReplyOperationActionSchema = z.nativeEnum(ReviewReplyOperationAction);

export const ReviewReplyOrderFieldSchema = z.nativeEnum(ReviewReplyOrderField);

export const ReviewRequestEventTypeSchema = z.nativeEnum(ReviewRequestEventType);

export const ReviewRequestOrderFieldSchema = z.nativeEnum(ReviewRequestOrderField);

export const ReviewRequestStatusSchema = z.nativeEnum(ReviewRequestStatus);

export const ReviewRequestTransitionActionSchema = z.nativeEnum(ReviewRequestTransitionAction);

export const ReviewTranslationSourceSchema = z.nativeEnum(ReviewTranslationSource);

export const ReviewVerificationStatusSchema = z.nativeEnum(ReviewVerificationStatus);

export const ReviewsOperationTypeSchema = z.nativeEnum(ReviewsOperationType);

export const SortDirectionSchema = z.nativeEnum(SortDirection);

export const WeightUnitSchema = z.nativeEnum(WeightUnit);

export function BooleanFilterSchema(): z.ZodObject<Properties<BooleanFilter>> {
  return z.object({
    _eq: z.boolean().nullish(),
    _is: z.boolean().nullish(),
    _isNot: z.boolean().nullish(),
    _neq: z.boolean().nullish()
  })
}

export function DateTimeFilterSchema(): z.ZodObject<Properties<DateTimeFilter>> {
  return z.object({
    _between: z.array(z.string()).nullish(),
    _eq: z.string().nullish(),
    _gt: z.string().nullish(),
    _gte: z.string().nullish(),
    _in: z.array(z.string()).nullish(),
    _is: z.boolean().nullish(),
    _isNot: z.boolean().nullish(),
    _lt: z.string().nullish(),
    _lte: z.string().nullish(),
    _neq: z.string().nullish(),
    _notIn: z.array(z.string()).nullish()
  })
}

export function FloatFilterSchema(): z.ZodObject<Properties<FloatFilter>> {
  return z.object({
    _between: z.array(z.number()).nullish(),
    _eq: z.number().nullish(),
    _gt: z.number().nullish(),
    _gte: z.number().nullish(),
    _in: z.array(z.number()).nullish(),
    _is: z.boolean().nullish(),
    _isNot: z.boolean().nullish(),
    _lt: z.number().nullish(),
    _lte: z.number().nullish(),
    _neq: z.number().nullish(),
    _notIn: z.array(z.number()).nullish()
  })
}

export function IdFilterSchema(): z.ZodObject<Properties<IdFilter>> {
  return z.object({
    _eq: z.string().nullish(),
    _in: z.array(z.string()).nullish(),
    _is: z.boolean().nullish(),
    _isNot: z.boolean().nullish(),
    _neq: z.string().nullish(),
    _notIn: z.array(z.string()).nullish()
  })
}

export function IntFilterSchema(): z.ZodObject<Properties<IntFilter>> {
  return z.object({
    _between: z.array(z.number()).nullish(),
    _eq: z.number().nullish(),
    _gt: z.number().nullish(),
    _gte: z.number().nullish(),
    _in: z.array(z.number()).nullish(),
    _is: z.boolean().nullish(),
    _isNot: z.boolean().nullish(),
    _lt: z.number().nullish(),
    _lte: z.number().nullish(),
    _neq: z.number().nullish(),
    _notIn: z.array(z.number()).nullish()
  })
}

export function ProductQuestionAnswerCreateOperationInputSchema(): z.ZodObject<Properties<ProductQuestionAnswerCreateOperationInput>> {
  return z.object({
    content: z.lazy(() => ReviewContentCreateInputSchema()),
    isAccepted: z.boolean().nullish(),
    isOfficial: z.boolean().nullish(),
    sortIndex: z.number().nullish()
  })
}

export function ProductQuestionAnswerOperationInputSchema(): z.ZodObject<Properties<ProductQuestionAnswerOperationInput>> {
  return z.object({
    action: ProductQuestionAnswerOperationActionSchema,
    answerId: z.string().nullish(),
    create: z.lazy(() => ProductQuestionAnswerCreateOperationInputSchema().nullish()),
    permanent: z.boolean().default(false).nullish(),
    update: z.lazy(() => ProductQuestionAnswerUpdateInputSchema().nullish())
  })
}

export function ProductQuestionAnswerOrderByInputSchema(): z.ZodObject<Properties<ProductQuestionAnswerOrderByInput>> {
  return z.object({
    direction: SortDirectionSchema,
    field: ProductQuestionAnswerOrderFieldSchema
  })
}

export function ProductQuestionAnswerPropertiesUpdateInputSchema(): z.ZodObject<Properties<ProductQuestionAnswerPropertiesUpdateInput>> {
  return z.object({
    isAccepted: z.boolean().nullish(),
    isOfficial: z.boolean().nullish(),
    sortIndex: z.number().nullish()
  })
}

export function ProductQuestionAnswerUpdateInputSchema(): z.ZodObject<Properties<ProductQuestionAnswerUpdateInput>> {
  return z.object({
    content: z.lazy(() => ReviewContentUpdateInputSchema().nullish()),
    properties: z.lazy(() => ProductQuestionAnswerPropertiesUpdateInputSchema().nullish())
  })
}

export function ProductQuestionAnswerWhereInputSchema(): z.ZodObject<Properties<ProductQuestionAnswerWhereInput>> {
  return z.object({
    _and: z.array(z.lazy(() => ProductQuestionAnswerWhereInputSchema())).nullish(),
    _not: z.lazy(() => ProductQuestionAnswerWhereInputSchema().nullish()),
    _or: z.array(z.lazy(() => ProductQuestionAnswerWhereInputSchema())).nullish(),
    authorCustomerId: z.lazy(() => IdFilterSchema().nullish()),
    authorType: z.lazy(() => StringFilterSchema().nullish()),
    body: z.lazy(() => StringFilterSchema().nullish()),
    createdAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    deletedAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    id: z.lazy(() => IdFilterSchema().nullish()),
    isAccepted: z.lazy(() => BooleanFilterSchema().nullish()),
    isOfficial: z.lazy(() => BooleanFilterSchema().nullish()),
    likeCount: z.lazy(() => StringFilterSchema().nullish()),
    locale: z.lazy(() => StringFilterSchema().nullish()),
    questionId: z.lazy(() => IdFilterSchema().nullish()),
    redactedAt: z.lazy(() => StringFilterSchema().nullish()),
    revision: z.lazy(() => IntFilterSchema().nullish()),
    sortIndex: z.lazy(() => IntFilterSchema().nullish()),
    status: z.lazy(() => StringFilterSchema().nullish()),
    updatedAt: z.lazy(() => DateTimeFilterSchema().nullish())
  })
}

export function ProductQuestionAnswersUpdateInputSchema(): z.ZodObject<Properties<ProductQuestionAnswersUpdateInput>> {
  return z.object({
    operations: z.array(z.lazy(() => ProductQuestionAnswerOperationInputSchema()))
  })
}

export function ProductQuestionCreateInputSchema(): z.ZodObject<Properties<ProductQuestionCreateInput>> {
  return z.object({
    content: z.lazy(() => ReviewContentCreateInputSchema()),
    productId: z.string(),
    variantId: z.string().nullish()
  })
}

export function ProductQuestionOrderByInputSchema(): z.ZodObject<Properties<ProductQuestionOrderByInput>> {
  return z.object({
    direction: SortDirectionSchema,
    field: ProductQuestionOrderFieldSchema
  })
}

export function ProductQuestionSubjectUpdateInputSchema(): z.ZodObject<Properties<ProductQuestionSubjectUpdateInput>> {
  return z.object({
    productId: z.string().nullish(),
    variantId: z.string().nullish()
  })
}

export function ProductQuestionSubscriptionUpdateOperationInputSchema(): z.ZodObject<Properties<ProductQuestionSubscriptionUpdateOperationInput>> {
  return z.object({
    action: ProductQuestionSubscriptionOperationActionSchema,
    subscriptionId: z.string(),
    values: z.lazy(() => ProductQuestionSubscriptionUpdateValuesInputSchema())
  })
}

export function ProductQuestionSubscriptionUpdateValuesInputSchema(): z.ZodObject<Properties<ProductQuestionSubscriptionUpdateValuesInput>> {
  return z.object({
    channel: ReviewNotificationChannelSchema.nullish(),
    locale: LocaleCodeSchema.nullish(),
    status: ProductQuestionSubscriptionStatusSchema.nullish()
  })
}

export function ProductQuestionUpdateInputSchema(): z.ZodObject<Properties<ProductQuestionUpdateInput>> {
  return z.object({
    answers: z.lazy(() => ProductQuestionAnswersUpdateInputSchema().nullish()),
    content: z.lazy(() => ReviewContentUpdateInputSchema().nullish()),
    subject: z.lazy(() => ProductQuestionSubjectUpdateInputSchema().nullish()),
    subscriptions: z.array(z.lazy(() => ProductQuestionSubscriptionUpdateOperationInputSchema())).nullish()
  })
}

export function ProductQuestionWhereInputSchema(): z.ZodObject<Properties<ProductQuestionWhereInput>> {
  return z.object({
    _and: z.array(z.lazy(() => ProductQuestionWhereInputSchema())).nullish(),
    _not: z.lazy(() => ProductQuestionWhereInputSchema().nullish()),
    _or: z.array(z.lazy(() => ProductQuestionWhereInputSchema())).nullish(),
    acceptedAnswerCount: z.lazy(() => IntFilterSchema().nullish()),
    answerCount: z.lazy(() => IntFilterSchema().nullish()),
    answerState: z.lazy(() => StringFilterSchema().nullish()),
    authorCustomerId: z.lazy(() => IdFilterSchema().nullish()),
    authorDisplayName: z.lazy(() => StringFilterSchema().nullish()),
    authorType: z.lazy(() => StringFilterSchema().nullish()),
    body: z.lazy(() => StringFilterSchema().nullish()),
    createdAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    deletedAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    id: z.lazy(() => IdFilterSchema().nullish()),
    likeCount: z.lazy(() => StringFilterSchema().nullish()),
    locale: z.lazy(() => StringFilterSchema().nullish()),
    officialAnswerCount: z.lazy(() => IntFilterSchema().nullish()),
    productId: z.lazy(() => IdFilterSchema().nullish()),
    publishedAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    redactedAt: z.lazy(() => StringFilterSchema().nullish()),
    reportCount: z.lazy(() => IntFilterSchema().nullish()),
    revision: z.lazy(() => IntFilterSchema().nullish()),
    sourceChannel: z.lazy(() => StringFilterSchema().nullish()),
    status: z.lazy(() => StringFilterSchema().nullish()),
    updatedAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    variantId: z.lazy(() => IdFilterSchema().nullish())
  })
}

export function ReviewContentAuthorCreateInputSchema(): z.ZodObject<Properties<ReviewContentAuthorCreateInput>> {
  return z.object({
    customerId: z.string().nullish(),
    displayName: z.string(),
    email: z.string().email().nullish(),
    principalId: z.string().nullish(),
    type: ReviewContentAuthorTypeSchema
  })
}

export function ReviewContentAuthorUpdateInputSchema(): z.ZodObject<Properties<ReviewContentAuthorUpdateInput>> {
  return z.object({
    customerId: z.string().nullish(),
    displayName: z.string().nullish(),
    email: z.string().email().nullish(),
    principalId: z.string().nullish(),
    type: ReviewContentAuthorTypeSchema.nullish()
  })
}

export function ReviewContentConnectionMetaInputSchema(): z.ZodObject<Properties<ReviewContentConnectionMetaInput>> {
  return z.object({
    includeDeleted: z.boolean().default(false).nullish(),
    includeRedacted: z.boolean().default(true).nullish()
  })
}

export function ReviewContentCreateInputSchema(): z.ZodObject<Properties<ReviewContentCreateInput>> {
  return z.object({
    author: z.lazy(() => ReviewContentAuthorCreateInputSchema()),
    body: z.string(),
    externalReferences: z.array(z.lazy(() => ReviewContentExternalReferenceCreateValuesInputSchema())).nullish(),
    locale: LocaleCodeSchema,
    moderationNote: z.string().nullish(),
    source: z.lazy(() => ReviewContentSourceCreateInputSchema().nullish()),
    status: ReviewContentStatusSchema.nullish(),
    title: z.string().nullish()
  })
}

export function ReviewContentDeleteInputSchema(): z.ZodObject<Properties<ReviewContentDeleteInput>> {
  return z.object({
    id: z.string(),
    permanent: z.boolean().default(false).nullish()
  })
}

export function ReviewContentExternalReferenceCreateValuesInputSchema(): z.ZodObject<Properties<ReviewContentExternalReferenceCreateValuesInput>> {
  return z.object({
    direction: ReviewExternalSyncDirectionSchema,
    externalId: z.string(),
    externalSystem: z.string(),
    externalType: z.string(),
    externalUrl: z.string().nullish(),
    metadata: z.record(z.unknown()).nullish()
  })
}

export function ReviewContentExternalReferenceIdentityInputSchema(): z.ZodObject<Properties<ReviewContentExternalReferenceIdentityInput>> {
  return z.object({
    externalId: z.string().nullish(),
    externalSystem: z.string().nullish(),
    externalType: z.string().nullish(),
    externalUrl: z.string().nullish()
  })
}

export function ReviewContentExternalReferenceOperationInputSchema(): z.ZodObject<Properties<ReviewContentExternalReferenceOperationInput>> {
  return z.object({
    action: ReviewContentExternalReferenceOperationActionSchema,
    create: z.lazy(() => ReviewContentExternalReferenceCreateValuesInputSchema().nullish()),
    externalReferenceId: z.string().nullish(),
    permanent: z.boolean().default(false).nullish(),
    update: z.lazy(() => ReviewContentExternalReferenceUpdateValuesInputSchema().nullish())
  })
}

export function ReviewContentExternalReferenceOrderByInputSchema(): z.ZodObject<Properties<ReviewContentExternalReferenceOrderByInput>> {
  return z.object({
    direction: SortDirectionSchema,
    field: ReviewContentExternalReferenceOrderFieldSchema
  })
}

export function ReviewContentExternalReferenceSyncInputSchema(): z.ZodObject<Properties<ReviewContentExternalReferenceSyncInput>> {
  return z.object({
    contentChecksum: z.string().nullish(),
    direction: ReviewExternalSyncDirectionSchema.nullish(),
    etag: z.string().nullish(),
    metadata: z.record(z.unknown()).nullish(),
    status: ReviewExternalSyncStatusSchema.nullish()
  })
}

export function ReviewContentExternalReferenceUpdateValuesInputSchema(): z.ZodObject<Properties<ReviewContentExternalReferenceUpdateValuesInput>> {
  return z.object({
    identity: z.lazy(() => ReviewContentExternalReferenceIdentityInputSchema().nullish()),
    sync: z.lazy(() => ReviewContentExternalReferenceSyncInputSchema().nullish())
  })
}

export function ReviewContentExternalReferenceWhereInputSchema(): z.ZodObject<Properties<ReviewContentExternalReferenceWhereInput>> {
  return z.object({
    _and: z.array(z.lazy(() => ReviewContentExternalReferenceWhereInputSchema())).nullish(),
    _not: z.lazy(() => ReviewContentExternalReferenceWhereInputSchema().nullish()),
    _or: z.array(z.lazy(() => ReviewContentExternalReferenceWhereInputSchema())).nullish(),
    contentId: z.lazy(() => IdFilterSchema().nullish()),
    createdAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    deletedAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    direction: z.lazy(() => StringFilterSchema().nullish()),
    externalId: z.lazy(() => StringFilterSchema().nullish()),
    externalSystem: z.lazy(() => StringFilterSchema().nullish()),
    externalType: z.lazy(() => StringFilterSchema().nullish()),
    id: z.lazy(() => IdFilterSchema().nullish()),
    lastSyncedAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    syncStatus: z.lazy(() => StringFilterSchema().nullish()),
    updatedAt: z.lazy(() => DateTimeFilterSchema().nullish())
  })
}

export function ReviewContentModerationInputSchema(): z.ZodObject<Properties<ReviewContentModerationInput>> {
  return z.object({
    moderationNote: z.string().nullish(),
    status: ReviewContentStatusSchema
  })
}

export function ReviewContentOrderByInputSchema(): z.ZodObject<Properties<ReviewContentOrderByInput>> {
  return z.object({
    direction: SortDirectionSchema,
    field: ReviewContentOrderFieldSchema
  })
}

export function ReviewContentPublicationSyncInputSchema(): z.ZodObject<Properties<ReviewContentPublicationSyncInput>> {
  return z.object({
    channel: z.string(),
    locale: LocaleCodeSchema.nullish(),
    scheduledAt: z.string().nullish(),
    status: ReviewPublicationStatusSchema
  })
}

export function ReviewContentReportAssignmentInputSchema(): z.ZodObject<Properties<ReviewContentReportAssignmentInput>> {
  return z.object({
    assignedToPrincipalId: z.string().nullish()
  })
}

export function ReviewContentReportOrderByInputSchema(): z.ZodObject<Properties<ReviewContentReportOrderByInput>> {
  return z.object({
    direction: SortDirectionSchema,
    field: ReviewContentReportOrderFieldSchema
  })
}

export function ReviewContentReportResolutionInputSchema(): z.ZodObject<Properties<ReviewContentReportResolutionInput>> {
  return z.object({
    note: z.string().nullish(),
    status: ReviewContentReportStatusSchema
  })
}

export function ReviewContentReportUpdateInputSchema(): z.ZodObject<Properties<ReviewContentReportUpdateInput>> {
  return z.object({
    assignment: z.lazy(() => ReviewContentReportAssignmentInputSchema().nullish()),
    resolution: z.lazy(() => ReviewContentReportResolutionInputSchema().nullish())
  })
}

export function ReviewContentReportWhereInputSchema(): z.ZodObject<Properties<ReviewContentReportWhereInput>> {
  return z.object({
    _and: z.array(z.lazy(() => ReviewContentReportWhereInputSchema())).nullish(),
    _not: z.lazy(() => ReviewContentReportWhereInputSchema().nullish()),
    _or: z.array(z.lazy(() => ReviewContentReportWhereInputSchema())).nullish(),
    assignedToPrincipalId: z.lazy(() => StringFilterSchema().nullish()),
    contentId: z.lazy(() => IdFilterSchema().nullish()),
    createdAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    id: z.lazy(() => IdFilterSchema().nullish()),
    reason: z.lazy(() => StringFilterSchema().nullish()),
    reporterCustomerId: z.lazy(() => IdFilterSchema().nullish()),
    resolvedAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    resolvedByPrincipalId: z.lazy(() => StringFilterSchema().nullish()),
    status: z.lazy(() => StringFilterSchema().nullish()),
    updatedAt: z.lazy(() => DateTimeFilterSchema().nullish())
  })
}

export function ReviewContentSourceCreateInputSchema(): z.ZodObject<Properties<ReviewContentSourceCreateInput>> {
  return z.object({
    channel: z.string().default("ADMIN").nullish(),
    metadata: z.record(z.unknown()).nullish()
  })
}

export function ReviewContentSourceUpdateInputSchema(): z.ZodObject<Properties<ReviewContentSourceUpdateInput>> {
  return z.object({
    channel: z.string().nullish(),
    metadata: z.record(z.unknown()).nullish()
  })
}

export function ReviewContentTextUpdateInputSchema(): z.ZodObject<Properties<ReviewContentTextUpdateInput>> {
  return z.object({
    body: z.string().nullish(),
    locale: LocaleCodeSchema.nullish(),
    title: z.string().nullish()
  })
}

export function ReviewContentTranslationSyncInputSchema(): z.ZodObject<Properties<ReviewContentTranslationSyncInput>> {
  return z.object({
    body: z.string(),
    locale: LocaleCodeSchema,
    source: ReviewTranslationSourceSchema,
    status: ReviewContentStatusSchema.nullish(),
    title: z.string().nullish()
  })
}

export function ReviewContentUpdateInputSchema(): z.ZodObject<Properties<ReviewContentUpdateInput>> {
  return z.object({
    author: z.lazy(() => ReviewContentAuthorUpdateInputSchema().nullish()),
    externalReferences: z.array(z.lazy(() => ReviewContentExternalReferenceOperationInputSchema())).nullish(),
    moderation: z.lazy(() => ReviewContentModerationInputSchema().nullish()),
    publications: z.array(z.lazy(() => ReviewContentPublicationSyncInputSchema())).nullish(),
    redact: z.boolean().nullish(),
    restoreRevision: z.number().nullish(),
    source: z.lazy(() => ReviewContentSourceUpdateInputSchema().nullish()),
    text: z.lazy(() => ReviewContentTextUpdateInputSchema().nullish()),
    translations: z.array(z.lazy(() => ReviewContentTranslationSyncInputSchema())).nullish()
  })
}

export function ReviewContentWhereInputSchema(): z.ZodObject<Properties<ReviewContentWhereInput>> {
  return z.object({
    _and: z.array(z.lazy(() => ReviewContentWhereInputSchema())).nullish(),
    _not: z.lazy(() => ReviewContentWhereInputSchema().nullish()),
    _or: z.array(z.lazy(() => ReviewContentWhereInputSchema())).nullish(),
    authorCustomerId: z.lazy(() => IdFilterSchema().nullish()),
    authorDisplayName: z.lazy(() => StringFilterSchema().nullish()),
    authorType: z.lazy(() => StringFilterSchema().nullish()),
    body: z.lazy(() => StringFilterSchema().nullish()),
    childCount: z.lazy(() => IntFilterSchema().nullish()),
    createdAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    deletedAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    dislikeCount: z.lazy(() => IntFilterSchema().nullish()),
    id: z.lazy(() => IdFilterSchema().nullish()),
    kind: z.lazy(() => StringFilterSchema().nullish()),
    likeCount: z.lazy(() => IntFilterSchema().nullish()),
    locale: z.lazy(() => StringFilterSchema().nullish()),
    mediaCount: z.lazy(() => IntFilterSchema().nullish()),
    openReportCount: z.lazy(() => IntFilterSchema().nullish()),
    publishedAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    redactedAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    reportCount: z.lazy(() => IntFilterSchema().nullish()),
    revision: z.lazy(() => IntFilterSchema().nullish()),
    sourceChannel: z.lazy(() => StringFilterSchema().nullish()),
    status: z.lazy(() => StringFilterSchema().nullish()),
    title: z.lazy(() => StringFilterSchema().nullish()),
    updatedAt: z.lazy(() => DateTimeFilterSchema().nullish())
  })
}

export function ReviewCreateInputSchema(): z.ZodObject<Properties<ReviewCreateInput>> {
  return z.object({
    content: z.lazy(() => ReviewContentCreateInputSchema()),
    incentive: z.lazy(() => ReviewIncentiveUpdateInputSchema().nullish()),
    media: z.array(z.lazy(() => ReviewMediaSyncItemInputSchema())).nullish(),
    orderId: z.string().nullish(),
    orderLineId: z.string().nullish(),
    productId: z.string(),
    rating: z.number(),
    ratings: z.array(z.lazy(() => ReviewRatingValueInputSchema())).nullish(),
    variantId: z.string().nullish(),
    verification: z.lazy(() => ReviewVerificationUpdateInputSchema().nullish())
  })
}

export function ReviewIncentiveUpdateInputSchema(): z.ZodObject<Properties<ReviewIncentiveUpdateInput>> {
  return z.object({
    disclosure: z.string().nullish(),
    isIncentivized: z.boolean()
  })
}

export function ReviewMediaSyncItemInputSchema(): z.ZodObject<Properties<ReviewMediaSyncItemInput>> {
  return z.object({
    caption: z.string().nullish(),
    fileId: z.string(),
    moderation: z.lazy(() => ReviewContentModerationInputSchema().nullish()),
    sortIndex: z.number()
  })
}

export function ReviewModerationCaseCreateInputSchema(): z.ZodObject<Properties<ReviewModerationCaseCreateInput>> {
  return z.object({
    assignedToPrincipalId: z.string().nullish(),
    contentId: z.string(),
    dueAt: z.string().nullish(),
    priority: z.number().nullish(),
    reasonCode: z.string()
  })
}

export function ReviewModerationCaseDetailsInputSchema(): z.ZodObject<Properties<ReviewModerationCaseDetailsInput>> {
  return z.object({
    assignedToPrincipalId: z.string().nullish(),
    dueAt: z.string().nullish(),
    priority: z.number().nullish(),
    reasonCode: z.string().nullish()
  })
}

export function ReviewModerationCaseOrderByInputSchema(): z.ZodObject<Properties<ReviewModerationCaseOrderByInput>> {
  return z.object({
    direction: SortDirectionSchema,
    field: ReviewModerationCaseOrderFieldSchema
  })
}

export function ReviewModerationCaseResolutionInputSchema(): z.ZodObject<Properties<ReviewModerationCaseResolutionInput>> {
  return z.object({
    resolutionCode: z.string().nullish(),
    resolutionNote: z.string().nullish(),
    status: ReviewModerationCaseStatusSchema
  })
}

export function ReviewModerationCaseUpdateInputSchema(): z.ZodObject<Properties<ReviewModerationCaseUpdateInput>> {
  return z.object({
    details: z.lazy(() => ReviewModerationCaseDetailsInputSchema().nullish()),
    resolution: z.lazy(() => ReviewModerationCaseResolutionInputSchema().nullish())
  })
}

export function ReviewModerationCaseWhereInputSchema(): z.ZodObject<Properties<ReviewModerationCaseWhereInput>> {
  return z.object({
    _and: z.array(z.lazy(() => ReviewModerationCaseWhereInputSchema())).nullish(),
    _not: z.lazy(() => ReviewModerationCaseWhereInputSchema().nullish()),
    _or: z.array(z.lazy(() => ReviewModerationCaseWhereInputSchema())).nullish(),
    assignedToPrincipalId: z.lazy(() => StringFilterSchema().nullish()),
    contentId: z.lazy(() => IdFilterSchema().nullish()),
    createdAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    dueAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    id: z.lazy(() => IdFilterSchema().nullish()),
    priority: z.lazy(() => IntFilterSchema().nullish()),
    reasonCode: z.lazy(() => StringFilterSchema().nullish()),
    resolutionCode: z.lazy(() => StringFilterSchema().nullish()),
    resolvedAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    resolvedByPrincipalId: z.lazy(() => StringFilterSchema().nullish()),
    status: z.lazy(() => StringFilterSchema().nullish()),
    updatedAt: z.lazy(() => DateTimeFilterSchema().nullish())
  })
}

export function ReviewOrderByInputSchema(): z.ZodObject<Properties<ReviewOrderByInput>> {
  return z.object({
    direction: SortDirectionSchema,
    field: ReviewOrderFieldSchema
  })
}

export function ReviewRatingCriterionApplicabilityInputSchema(): z.ZodObject<Properties<ReviewRatingCriterionApplicabilityInput>> {
  return z.object({
    appliesToAllProducts: z.boolean()
  })
}

export function ReviewRatingCriterionAssignmentInputSchema(): z.ZodObject<Properties<ReviewRatingCriterionAssignmentInput>> {
  return z.object({
    isRequiredOverride: z.boolean().nullish(),
    sortIndexOverride: z.number().nullish(),
    targetId: z.string(),
    targetType: ReviewRatingCriterionTargetTypeSchema
  })
}

export function ReviewRatingCriterionCreateInputSchema(): z.ZodObject<Properties<ReviewRatingCriterionCreateInput>> {
  return z.object({
    appliesToAllProducts: z.boolean().nullish(),
    assignments: z.array(z.lazy(() => ReviewRatingCriterionAssignmentInputSchema())).nullish(),
    code: z.string(),
    defaultDescription: z.string().nullish(),
    defaultTitle: z.string(),
    isActive: z.boolean().nullish(),
    isRequired: z.boolean().nullish(),
    sortIndex: z.number().nullish(),
    translations: z.array(z.lazy(() => ReviewRatingCriterionTranslationInputSchema())).nullish(),
    weight: z.number().nullish()
  })
}

export function ReviewRatingCriterionDefinitionInputSchema(): z.ZodObject<Properties<ReviewRatingCriterionDefinitionInput>> {
  return z.object({
    code: z.string().nullish(),
    defaultDescription: z.string().nullish(),
    defaultTitle: z.string().nullish(),
    isActive: z.boolean().nullish(),
    isRequired: z.boolean().nullish(),
    sortIndex: z.number().nullish(),
    weight: z.number().nullish()
  })
}

export function ReviewRatingCriterionDeleteInputSchema(): z.ZodObject<Properties<ReviewRatingCriterionDeleteInput>> {
  return z.object({
    id: z.string(),
    permanent: z.boolean().default(false).nullish()
  })
}

export function ReviewRatingCriterionOrderByInputSchema(): z.ZodObject<Properties<ReviewRatingCriterionOrderByInput>> {
  return z.object({
    direction: SortDirectionSchema,
    field: ReviewRatingCriterionOrderFieldSchema
  })
}

export function ReviewRatingCriterionTranslationInputSchema(): z.ZodObject<Properties<ReviewRatingCriterionTranslationInput>> {
  return z.object({
    description: z.string().nullish(),
    locale: LocaleCodeSchema,
    title: z.string()
  })
}

export function ReviewRatingCriterionUpdateInputSchema(): z.ZodObject<Properties<ReviewRatingCriterionUpdateInput>> {
  return z.object({
    applicability: z.lazy(() => ReviewRatingCriterionApplicabilityInputSchema().nullish()),
    assignments: z.array(z.lazy(() => ReviewRatingCriterionAssignmentInputSchema())).nullish(),
    definition: z.lazy(() => ReviewRatingCriterionDefinitionInputSchema().nullish()),
    translations: z.array(z.lazy(() => ReviewRatingCriterionTranslationInputSchema())).nullish()
  })
}

export function ReviewRatingCriterionWhereInputSchema(): z.ZodObject<Properties<ReviewRatingCriterionWhereInput>> {
  return z.object({
    _and: z.array(z.lazy(() => ReviewRatingCriterionWhereInputSchema())).nullish(),
    _not: z.lazy(() => ReviewRatingCriterionWhereInputSchema().nullish()),
    _or: z.array(z.lazy(() => ReviewRatingCriterionWhereInputSchema())).nullish(),
    appliesToAllProducts: z.lazy(() => BooleanFilterSchema().nullish()),
    code: z.lazy(() => StringFilterSchema().nullish()),
    createdAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    defaultTitle: z.lazy(() => StringFilterSchema().nullish()),
    deletedAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    id: z.lazy(() => IdFilterSchema().nullish()),
    isActive: z.lazy(() => BooleanFilterSchema().nullish()),
    isRequired: z.lazy(() => BooleanFilterSchema().nullish()),
    sortIndex: z.lazy(() => IntFilterSchema().nullish()),
    updatedAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    weight: z.lazy(() => FloatFilterSchema().nullish())
  })
}

export function ReviewRatingUpdateInputSchema(): z.ZodObject<Properties<ReviewRatingUpdateInput>> {
  return z.object({
    criteria: z.array(z.lazy(() => ReviewRatingValueInputSchema())).nullish(),
    overall: z.number().nullish()
  })
}

export function ReviewRatingValueInputSchema(): z.ZodObject<Properties<ReviewRatingValueInput>> {
  return z.object({
    criterionId: z.string(),
    value: z.number()
  })
}

export function ReviewRepliesUpdateInputSchema(): z.ZodObject<Properties<ReviewRepliesUpdateInput>> {
  return z.object({
    operations: z.array(z.lazy(() => ReviewReplyOperationInputSchema()))
  })
}

export function ReviewReplyCreateOperationInputSchema(): z.ZodObject<Properties<ReviewReplyCreateOperationInput>> {
  return z.object({
    content: z.lazy(() => ReviewContentCreateInputSchema()),
    isOfficial: z.boolean().default(true).nullish(),
    sortIndex: z.number().nullish()
  })
}

export function ReviewReplyOperationInputSchema(): z.ZodObject<Properties<ReviewReplyOperationInput>> {
  return z.object({
    action: ReviewReplyOperationActionSchema,
    create: z.lazy(() => ReviewReplyCreateOperationInputSchema().nullish()),
    permanent: z.boolean().default(false).nullish(),
    replyId: z.string().nullish(),
    update: z.lazy(() => ReviewReplyUpdateInputSchema().nullish())
  })
}

export function ReviewReplyOrderByInputSchema(): z.ZodObject<Properties<ReviewReplyOrderByInput>> {
  return z.object({
    direction: SortDirectionSchema,
    field: ReviewReplyOrderFieldSchema
  })
}

export function ReviewReplyPropertiesUpdateInputSchema(): z.ZodObject<Properties<ReviewReplyPropertiesUpdateInput>> {
  return z.object({
    isOfficial: z.boolean().nullish(),
    sortIndex: z.number().nullish()
  })
}

export function ReviewReplyUpdateInputSchema(): z.ZodObject<Properties<ReviewReplyUpdateInput>> {
  return z.object({
    content: z.lazy(() => ReviewContentUpdateInputSchema().nullish()),
    properties: z.lazy(() => ReviewReplyPropertiesUpdateInputSchema().nullish())
  })
}

export function ReviewReplyWhereInputSchema(): z.ZodObject<Properties<ReviewReplyWhereInput>> {
  return z.object({
    _and: z.array(z.lazy(() => ReviewReplyWhereInputSchema())).nullish(),
    _not: z.lazy(() => ReviewReplyWhereInputSchema().nullish()),
    _or: z.array(z.lazy(() => ReviewReplyWhereInputSchema())).nullish(),
    authorCustomerId: z.lazy(() => IdFilterSchema().nullish()),
    authorType: z.lazy(() => StringFilterSchema().nullish()),
    body: z.lazy(() => StringFilterSchema().nullish()),
    createdAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    deletedAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    id: z.lazy(() => IdFilterSchema().nullish()),
    isOfficial: z.lazy(() => BooleanFilterSchema().nullish()),
    likeCount: z.lazy(() => StringFilterSchema().nullish()),
    locale: z.lazy(() => StringFilterSchema().nullish()),
    redactedAt: z.lazy(() => StringFilterSchema().nullish()),
    reviewId: z.lazy(() => IdFilterSchema().nullish()),
    revision: z.lazy(() => IntFilterSchema().nullish()),
    sortIndex: z.lazy(() => IntFilterSchema().nullish()),
    status: z.lazy(() => StringFilterSchema().nullish()),
    updatedAt: z.lazy(() => DateTimeFilterSchema().nullish())
  })
}

export function ReviewRequestCreateInputSchema(): z.ZodObject<Properties<ReviewRequestCreateInput>> {
  return z.object({
    channel: ReviewNotificationChannelSchema,
    customerId: z.string(),
    expiresAt: z.string().nullish(),
    locale: LocaleCodeSchema,
    orderId: z.string(),
    orderLineId: z.string(),
    productId: z.string(),
    scheduledAt: z.string(),
    sourceChannel: z.string().default("ADMIN").nullish(),
    variantId: z.string().nullish()
  })
}

export function ReviewRequestDeliveryUpdateInputSchema(): z.ZodObject<Properties<ReviewRequestDeliveryUpdateInput>> {
  return z.object({
    channel: ReviewNotificationChannelSchema.nullish(),
    locale: LocaleCodeSchema.nullish()
  })
}

export function ReviewRequestOrderByInputSchema(): z.ZodObject<Properties<ReviewRequestOrderByInput>> {
  return z.object({
    direction: SortDirectionSchema,
    field: ReviewRequestOrderFieldSchema
  })
}

export function ReviewRequestScheduleUpdateInputSchema(): z.ZodObject<Properties<ReviewRequestScheduleUpdateInput>> {
  return z.object({
    expiresAt: z.string().nullish(),
    scheduledAt: z.string()
  })
}

export function ReviewRequestTransitionInputSchema(): z.ZodObject<Properties<ReviewRequestTransitionInput>> {
  return z.object({
    action: ReviewRequestTransitionActionSchema,
    reason: z.string().nullish()
  })
}

export function ReviewRequestUpdateInputSchema(): z.ZodObject<Properties<ReviewRequestUpdateInput>> {
  return z.object({
    delivery: z.lazy(() => ReviewRequestDeliveryUpdateInputSchema().nullish()),
    schedule: z.lazy(() => ReviewRequestScheduleUpdateInputSchema().nullish()),
    transition: z.lazy(() => ReviewRequestTransitionInputSchema().nullish())
  })
}

export function ReviewRequestWhereInputSchema(): z.ZodObject<Properties<ReviewRequestWhereInput>> {
  return z.object({
    _and: z.array(z.lazy(() => ReviewRequestWhereInputSchema())).nullish(),
    _not: z.lazy(() => ReviewRequestWhereInputSchema().nullish()),
    _or: z.array(z.lazy(() => ReviewRequestWhereInputSchema())).nullish(),
    attemptCount: z.lazy(() => IntFilterSchema().nullish()),
    channel: z.lazy(() => StringFilterSchema().nullish()),
    createdAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    customerId: z.lazy(() => IdFilterSchema().nullish()),
    deliveredAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    expiresAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    id: z.lazy(() => IdFilterSchema().nullish()),
    locale: z.lazy(() => StringFilterSchema().nullish()),
    openedAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    orderId: z.lazy(() => IdFilterSchema().nullish()),
    orderLineId: z.lazy(() => IdFilterSchema().nullish()),
    productId: z.lazy(() => IdFilterSchema().nullish()),
    providerMessageId: z.lazy(() => StringFilterSchema().nullish()),
    reviewId: z.lazy(() => IdFilterSchema().nullish()),
    scheduledAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    sentAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    sourceChannel: z.lazy(() => StringFilterSchema().nullish()),
    status: z.lazy(() => StringFilterSchema().nullish()),
    submittedAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    updatedAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    variantId: z.lazy(() => IdFilterSchema().nullish())
  })
}

export function ReviewStoreConfigurationUpdateInputSchema(): z.ZodObject<Properties<ReviewStoreConfigurationUpdateInput>> {
  return z.object({
    answerEditWindowHours: z.number().nullish(),
    answerModerationMode: ReviewModerationModeSchema.nullish(),
    customerAnswersEnabled: z.boolean().nullish(),
    guestQuestionsEnabled: z.boolean().nullish(),
    guestReviewsEnabled: z.boolean().nullish(),
    maxAnswersPerQuestion: z.number().nullish(),
    maxReviewMediaCount: z.number().nullish(),
    questionEditWindowHours: z.number().nullish(),
    questionModerationMode: ReviewModerationModeSchema.nullish(),
    questionsEnabled: z.boolean().nullish(),
    reviewDuplicatePolicy: ReviewDuplicatePolicySchema.nullish(),
    reviewEditWindowHours: z.number().nullish(),
    reviewModerationMode: ReviewModerationModeSchema.nullish(),
    reviewRequestDelayDays: z.number().nullish(),
    reviewRequestExpiryDays: z.number().nullish(),
    reviewRequestsEnabled: z.boolean().nullish(),
    reviewsEnabled: z.boolean().nullish(),
    verifiedPurchaseRequired: z.boolean().nullish()
  })
}

export function ReviewSubjectUpdateInputSchema(): z.ZodObject<Properties<ReviewSubjectUpdateInput>> {
  return z.object({
    orderId: z.string().nullish(),
    orderLineId: z.string().nullish(),
    productId: z.string().nullish(),
    variantId: z.string().nullish()
  })
}

export function ReviewUpdateInputSchema(): z.ZodObject<Properties<ReviewUpdateInput>> {
  return z.object({
    content: z.lazy(() => ReviewContentUpdateInputSchema().nullish()),
    incentive: z.lazy(() => ReviewIncentiveUpdateInputSchema().nullish()),
    media: z.array(z.lazy(() => ReviewMediaSyncItemInputSchema())).nullish(),
    rating: z.lazy(() => ReviewRatingUpdateInputSchema().nullish()),
    replies: z.lazy(() => ReviewRepliesUpdateInputSchema().nullish()),
    subject: z.lazy(() => ReviewSubjectUpdateInputSchema().nullish()),
    verification: z.lazy(() => ReviewVerificationUpdateInputSchema().nullish())
  })
}

export function ReviewVerificationUpdateInputSchema(): z.ZodObject<Properties<ReviewVerificationUpdateInput>> {
  return z.object({
    method: z.string().nullish(),
    status: ReviewVerificationStatusSchema,
    verifiedAt: z.string().nullish()
  })
}

export function ReviewWhereInputSchema(): z.ZodObject<Properties<ReviewWhereInput>> {
  return z.object({
    _and: z.array(z.lazy(() => ReviewWhereInputSchema())).nullish(),
    _not: z.lazy(() => ReviewWhereInputSchema().nullish()),
    _or: z.array(z.lazy(() => ReviewWhereInputSchema())).nullish(),
    authorCustomerId: z.lazy(() => IdFilterSchema().nullish()),
    authorDisplayName: z.lazy(() => StringFilterSchema().nullish()),
    authorType: z.lazy(() => StringFilterSchema().nullish()),
    body: z.lazy(() => StringFilterSchema().nullish()),
    createdAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    deletedAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    dislikeCount: z.lazy(() => IntFilterSchema().nullish()),
    id: z.lazy(() => IdFilterSchema().nullish()),
    isIncentivized: z.lazy(() => BooleanFilterSchema().nullish()),
    likeCount: z.lazy(() => IntFilterSchema().nullish()),
    locale: z.lazy(() => StringFilterSchema().nullish()),
    mediaCount: z.lazy(() => IntFilterSchema().nullish()),
    openReportCount: z.lazy(() => IntFilterSchema().nullish()),
    orderId: z.lazy(() => IdFilterSchema().nullish()),
    orderLineId: z.lazy(() => IdFilterSchema().nullish()),
    productId: z.lazy(() => IdFilterSchema().nullish()),
    publishedAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    rating: z.lazy(() => IntFilterSchema().nullish()),
    reportCount: z.lazy(() => IntFilterSchema().nullish()),
    revision: z.lazy(() => IntFilterSchema().nullish()),
    sourceChannel: z.lazy(() => StringFilterSchema().nullish()),
    status: z.lazy(() => StringFilterSchema().nullish()),
    title: z.lazy(() => StringFilterSchema().nullish()),
    updatedAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    variantId: z.lazy(() => IdFilterSchema().nullish()),
    verificationStatus: z.lazy(() => StringFilterSchema().nullish())
  })
}

export function StringFilterSchema(): z.ZodObject<Properties<StringFilter>> {
  return z.object({
    _contains: z.string().nullish(),
    _containsi: z.string().nullish(),
    _endsWith: z.string().nullish(),
    _endsWithi: z.string().nullish(),
    _eq: z.string().nullish(),
    _in: z.array(z.string()).nullish(),
    _is: z.boolean().nullish(),
    _isNot: z.boolean().nullish(),
    _neq: z.string().nullish(),
    _notContains: z.string().nullish(),
    _notContainsi: z.string().nullish(),
    _notIn: z.array(z.string()).nullish(),
    _startsWith: z.string().nullish(),
    _startsWithi: z.string().nullish()
  })
}

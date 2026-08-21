import type { WhereFieldMapper } from "@shopana/drizzle-query";
import {
  decodeGlobalIdByType,
  GlobalIdEntity,
  type GlobalIdType,
} from "@shopana/shared-graphql-guid";

function decodeGlobalIdOrReturnValue(value: unknown, entity?: GlobalIdType): unknown {
  if (typeof value !== "string") {
    return value;
  }

  try {
    return decodeGlobalIdByType(value, entity);
  } catch {
    return value;
  }
}

function createGlobalIdWhereFieldMapper(entity?: GlobalIdType): WhereFieldMapper {
  return (value) => decodeGlobalIdOrReturnValue(value, entity);
}

export const decodeReviewsOwnedGlobalId = createGlobalIdWhereFieldMapper();
export const decodeProductGlobalId = createGlobalIdWhereFieldMapper(GlobalIdEntity.Product);
export const decodeVariantGlobalId = createGlobalIdWhereFieldMapper(GlobalIdEntity.Variant);
export const decodeCategoryGlobalId = createGlobalIdWhereFieldMapper(GlobalIdEntity.Category);
export const decodeCustomerGlobalId = createGlobalIdWhereFieldMapper(GlobalIdEntity.Customer);
export const decodeOrderGlobalId = createGlobalIdWhereFieldMapper(GlobalIdEntity.Order);
export const decodeOrderLineGlobalId = createGlobalIdWhereFieldMapper(GlobalIdEntity.OrderLine);
export const decodeReviewGlobalId = createGlobalIdWhereFieldMapper(GlobalIdEntity.Review);
export const decodeReviewReplyGlobalId = createGlobalIdWhereFieldMapper(GlobalIdEntity.ReviewReply);
export const decodeReviewRequestGlobalId = createGlobalIdWhereFieldMapper(
  GlobalIdEntity.ReviewRequest,
);
export const decodeProductQuestionGlobalId = createGlobalIdWhereFieldMapper(
  GlobalIdEntity.ProductQuestion,
);
export const decodeProductQuestionAnswerGlobalId = createGlobalIdWhereFieldMapper(
  GlobalIdEntity.ProductQuestionAnswer,
);
export const decodeProductQuestionSubscriptionGlobalId = createGlobalIdWhereFieldMapper(
  GlobalIdEntity.ProductQuestionSubscription,
);
export const decodeReviewRequestEventGlobalId = createGlobalIdWhereFieldMapper(
  GlobalIdEntity.ReviewRequestEvent,
);
export const decodeReviewContentVoteGlobalId = createGlobalIdWhereFieldMapper(
  GlobalIdEntity.ReviewContentVote,
);
export const decodeModerationEventGlobalId = createGlobalIdWhereFieldMapper(
  GlobalIdEntity.ReviewModerationEvent,
);
export const decodeModerationSignalGlobalId = createGlobalIdWhereFieldMapper(
  GlobalIdEntity.ReviewModerationSignal,
);

export const decodeContentRevisionGlobalId = createGlobalIdWhereFieldMapper(
  GlobalIdEntity.ReviewContentRevision,
);
export const decodeRatingCriterionGlobalId = createGlobalIdWhereFieldMapper(
  GlobalIdEntity.ReviewRatingCriterion,
);
export const decodeContentReportGlobalId = createGlobalIdWhereFieldMapper(
  GlobalIdEntity.ReviewContentReport,
);
export const decodeModerationCaseGlobalId = createGlobalIdWhereFieldMapper(
  GlobalIdEntity.ReviewModerationCase,
);
export const decodeContentExternalReferenceGlobalId = createGlobalIdWhereFieldMapper(
  GlobalIdEntity.ReviewContentExternalReference,
);

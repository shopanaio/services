import { ApolloMutation } from "@shopana/type-resolver";
import { ReviewsType } from "./ReviewsType.js";

const createPayload = (field: string) => ({ [field]: null, userErrors: [] });
const updatePayload = (field: string) => ({
  [field]: null,
  operationResults: [],
  userErrors: [],
});
const deletePayload = (field: string) => ({ [field]: null, userErrors: [] });

@ApolloMutation
export class MutationResolver extends ReviewsType<Record<string, never>> {
  reviewsMutation() {
    return this.resolvers.reviewsMutation();
  }
}

/**
 * Mutation contract placeholder.
 *
 * Every schema field is intentionally present, but no command is executed yet.
 * Payloads remain GraphQL-valid and contain no entity, operation result, or error.
 */
export class ReviewsMutationResolver extends ReviewsType<Record<string, never>> {
  storeConfigurationUpdate() { return updatePayload("configuration"); }
  ratingCriterionCreate() { return createPayload("criterion"); }
  ratingCriterionUpdate() { return updatePayload("criterion"); }
  ratingCriterionDelete() { return deletePayload("deletedCriterionId"); }

  reviewCreate() { return createPayload("review"); }
  reviewUpdate() { return updatePayload("review"); }
  reviewDelete() { return deletePayload("deletedReviewId"); }

  productQuestionCreate() { return createPayload("productQuestion"); }
  productQuestionUpdate() { return updatePayload("productQuestion"); }
  productQuestionDelete() { return deletePayload("deletedProductQuestionId"); }
  productQuestionSubscriptionUpdate() { return updatePayload("subscription"); }

  contentRedact() { return updatePayload("content"); }
  contentRevisionRestore() { return updatePayload("content"); }

  reviewRequestCreate() { return createPayload("reviewRequest"); }
  reviewRequestUpdate() { return updatePayload("reviewRequest"); }
  contentReportUpdate() { return updatePayload("contentReport"); }
  moderationCaseCreate() { return createPayload("moderationCase"); }
  moderationCaseUpdate() { return updatePayload("moderationCase"); }
  contentExternalReferenceCreate() { return createPayload("externalReference"); }
  contentExternalReferenceUpdate() { return updatePayload("externalReference"); }
  contentExternalReferenceDelete() { return deletePayload("deletedExternalReferenceId"); }
}

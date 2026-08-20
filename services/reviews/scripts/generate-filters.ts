import { mkdirSync, writeFileSync } from "fs";
import {
  generateBaseFilterTypes,
  generateOrderByInputType,
  generateWhereInputType,
  type GraphQLFieldType,
} from "@shopana/drizzle-query";
import { ratingCriterionRelayQuery } from "../src/repositories/configuration/ConfigurationRepository.js";
import { contentRelayQuery } from "../src/repositories/content/ContentRepository.js";
import { contentReportRelayQuery } from "../src/repositories/engagement/EngagementRepository.js";
import { contentExternalReferenceRelayQuery } from "../src/repositories/integration/ExternalReferenceRepository.js";
import { moderationCaseRelayQuery } from "../src/repositories/moderation/ModerationRepository.js";
import { productQuestionAnswerRelayQuery } from "../src/repositories/question/ProductQuestionAnswerRepository.js";
import { productQuestionRelayQuery } from "../src/repositories/question/ProductQuestionRepository.js";
import { reviewReplyRelayQuery } from "../src/repositories/review/ReviewReplyRepository.js";
import { reviewRelayQuery } from "../src/repositories/review/ReviewRepository.js";
import { reviewRequestRelayQuery } from "../src/repositories/request/ReviewRequestRepository.js";

const outputDirectory = "src/api/graphql-admin/schema/__generated__";

const baseFilters = `# Auto-generated GraphQL base filter types for Reviews service.
# Do not edit manually. Run: yarn shopana codegen --service reviews

${generateBaseFilterTypes()}
`;

const id = "ID" satisfies GraphQLFieldType;
const string = "String" satisfies GraphQLFieldType;
const int = "Int" satisfies GraphQLFieldType;
const float = "Float" satisfies GraphQLFieldType;
const boolean = "Boolean" satisfies GraphQLFieldType;
const dateTime = "DateTime" satisfies GraphQLFieldType;

const contentFields: Record<string, GraphQLFieldType> = {
  id,
  kind: string,
  title: string,
  body: string,
  locale: string,
  authorType: string,
  authorCustomerId: id,
  authorDisplayName: string,
  sourceChannel: string,
  status: string,
  revision: int,
  createdAt: dateTime,
  updatedAt: dateTime,
  publishedAt: dateTime,
  deletedAt: dateTime,
  redactedAt: dateTime,
  likeCount: int,
  dislikeCount: int,
  reportCount: int,
  openReportCount: int,
  mediaCount: int,
  childCount: int,
};

const reviewFields: Record<string, GraphQLFieldType> = {
  ...contentFields,
  productId: id,
  variantId: id,
  orderId: id,
  orderLineId: id,
  rating: int,
  verificationStatus: string,
  isIncentivized: boolean,
};

const reviewReplyFields: Record<string, GraphQLFieldType> = {
  id,
  reviewId: id,
  isOfficial: boolean,
  sortIndex: int,
  body: string,
  locale: string,
  authorType: string,
  authorCustomerId: id,
  status: string,
  revision: int,
  createdAt: dateTime,
  updatedAt: dateTime,
  deletedAt: dateTime,
};

const productQuestionFields: Record<string, GraphQLFieldType> = {
  id,
  productId: id,
  variantId: id,
  body: string,
  locale: string,
  authorType: string,
  authorCustomerId: id,
  authorDisplayName: string,
  sourceChannel: string,
  status: string,
  answerState: string,
  revision: int,
  createdAt: dateTime,
  updatedAt: dateTime,
  publishedAt: dateTime,
  deletedAt: dateTime,
  answerCount: int,
  officialAnswerCount: int,
  acceptedAnswerCount: int,
  reportCount: int,
};

const productQuestionAnswerFields: Record<string, GraphQLFieldType> = {
  id,
  questionId: id,
  isOfficial: boolean,
  isAccepted: boolean,
  sortIndex: int,
  body: string,
  locale: string,
  authorType: string,
  authorCustomerId: id,
  status: string,
  revision: int,
  createdAt: dateTime,
  updatedAt: dateTime,
  deletedAt: dateTime,
};

const reviewRequestFields: Record<string, GraphQLFieldType> = {
  id,
  customerId: id,
  orderId: id,
  orderLineId: id,
  productId: id,
  variantId: id,
  reviewId: id,
  channel: string,
  status: string,
  locale: string,
  sourceChannel: string,
  providerMessageId: string,
  attemptCount: int,
  scheduledAt: dateTime,
  sentAt: dateTime,
  deliveredAt: dateTime,
  openedAt: dateTime,
  submittedAt: dateTime,
  expiresAt: dateTime,
  createdAt: dateTime,
  updatedAt: dateTime,
};

const ratingCriterionFields: Record<string, GraphQLFieldType> = {
  id,
  code: string,
  defaultTitle: string,
  weight: float,
  isRequired: boolean,
  isActive: boolean,
  appliesToAllProducts: boolean,
  sortIndex: int,
  createdAt: dateTime,
  updatedAt: dateTime,
  deletedAt: dateTime,
};

const contentReportFields: Record<string, GraphQLFieldType> = {
  id,
  contentId: id,
  reporterCustomerId: id,
  reason: string,
  status: string,
  assignedToPrincipalId: string,
  resolvedByPrincipalId: string,
  resolvedAt: dateTime,
  createdAt: dateTime,
  updatedAt: dateTime,
};

const moderationCaseFields: Record<string, GraphQLFieldType> = {
  id,
  contentId: id,
  status: string,
  priority: int,
  reasonCode: string,
  assignedToPrincipalId: string,
  dueAt: dateTime,
  resolutionCode: string,
  resolvedByPrincipalId: string,
  resolvedAt: dateTime,
  createdAt: dateTime,
  updatedAt: dateTime,
};

const externalReferenceFields: Record<string, GraphQLFieldType> = {
  id,
  contentId: id,
  externalSystem: string,
  externalType: string,
  externalId: string,
  direction: string,
  syncStatus: string,
  lastSyncedAt: dateTime,
  createdAt: dateTime,
  updatedAt: dateTime,
  deletedAt: dateTime,
};

function generateTypes(
  query: Parameters<typeof generateWhereInputType>[0],
  name: string,
  fieldTypes: Record<string, GraphQLFieldType>,
  whereExcludeFields: string[],
  orderExcludeFields = whereExcludeFields,
): string {
  const common = { includeDescriptions: true, fieldTypes };
  return [
    `# ---- ${name} ----`,
    generateWhereInputType(query, name, {
      ...common,
      excludeFields: whereExcludeFields,
    }),
    generateOrderByInputType(query, name, {
      ...common,
      excludeFields: orderExcludeFields,
    }),
  ].join("\n\n");
}

const filters = `# Auto-generated GraphQL filters for Reviews service.
# Do not edit manually. Run: yarn shopana codegen --service reviews

${[
  generateTypes(
    contentRelayQuery,
    "ReviewContent",
    contentFields,
    ["storeId", "officialChildCount", "acceptedChildCount"],
    ["storeId", "body", "authorCustomerId", "officialChildCount", "acceptedChildCount"],
  ),
  generateTypes(
    reviewRelayQuery,
    "Review",
    reviewFields,
    ["storeId", "kind", "redactedAt", "childCount", "officialChildCount", "acceptedChildCount"],
    [
      "storeId",
      "kind",
      "body",
      "authorCustomerId",
      "orderId",
      "orderLineId",
      "redactedAt",
      "childCount",
      "officialChildCount",
      "acceptedChildCount",
    ],
  ),
  generateTypes(
    reviewReplyRelayQuery,
    "ReviewReply",
    reviewReplyFields,
    ["storeId"],
    ["storeId", "body", "authorCustomerId"],
  ),
  generateTypes(
    productQuestionRelayQuery,
    "ProductQuestion",
    productQuestionFields,
    ["storeId"],
    ["storeId", "body", "authorCustomerId"],
  ),
  generateTypes(
    productQuestionAnswerRelayQuery,
    "ProductQuestionAnswer",
    productQuestionAnswerFields,
    ["storeId"],
    ["storeId", "body", "authorCustomerId"],
  ),
  generateTypes(reviewRequestRelayQuery, "ReviewRequest", reviewRequestFields, [
    "storeId",
    "idempotencyKey",
    "accessTokenHash",
    "lastError",
  ]),
  generateTypes(ratingCriterionRelayQuery, "ReviewRatingCriterion", ratingCriterionFields, [
    "storeId",
    "defaultDescription",
  ]),
  generateTypes(contentReportRelayQuery, "ReviewContentReport", contentReportFields, [
    "storeId",
    "reporterKey",
    "details",
    "resolutionNote",
  ]),
  generateTypes(moderationCaseRelayQuery, "ReviewModerationCase", moderationCaseFields, [
    "storeId",
    "resolutionNote",
  ]),
  generateTypes(
    contentExternalReferenceRelayQuery,
    "ReviewContentExternalReference",
    externalReferenceFields,
    ["storeId", "externalUrl", "etag", "contentChecksum", "lastError", "metadata"],
  ),
].join("\n\n")}
`;

mkdirSync(outputDirectory, { recursive: true });
writeFileSync(`${outputDirectory}/base-filters.graphql`, baseFilters);
writeFileSync(`${outputDirectory}/filters.graphql`, filters);

console.log("Generated Reviews GraphQL filters");

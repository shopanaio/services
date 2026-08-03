import { decodeGlobalIdByType, GlobalIdEntity, type GlobalIdType } from "@shopana/shared-graphql-guid";
import { parseGraphqlInfo } from "@shopana/type-resolver";
import type { GraphQLResolveInfo } from "graphql";
import type { ServiceContext } from "../../../context/types.js";
import { requireStorefrontPermission, STOREFRONT_PERMISSIONS } from "@shopana/shared-context";
import { RatingCriterionAssignmentResolver, RatingCriterionResolver, StoreConfigurationResolver } from "../../../resolvers/storefront/ConfigurationResolver.js";
import { ContentPublicationResolver, ContentTranslationResolver } from "../../../resolvers/storefront/ContentResolver.js";
import { ContentReportResolver, ContentVoteResolver } from "../../../resolvers/storefront/EngagementResolver.js";
import { CustomerFederationResolver, ProductFederationResolver, ProductVariantFederationResolver } from "../../../resolvers/storefront/FederationResolvers.js";
import { ProductQuestionAnswerResolver, ProductQuestionResolver, QuestionSubscriptionResolver } from "../../../resolvers/storefront/QuestionResolver.js";
import { ReviewMediaResolver, ReviewReplyResolver, ReviewResolver } from "../../../resolvers/storefront/ReviewResolver.js";
import { ReviewRequestEventResolver, ReviewRequestResolver } from "../../../resolvers/storefront/ReviewRequestResolver.js";
import { ContentRevisionResolver, ModerationCaseResolver, ModerationEventResolver, ModerationSignalResolver } from "../../../resolvers/storefront/ModerationResolver.js";
import { ContentExternalReferenceResolver } from "../../../resolvers/storefront/ExternalReferenceResolver.js";
import type { Resolvers } from "../../../resolvers/storefront/generated/types.js";

type Loadable = { load(value: string, query: ReturnType<typeof parseGraphqlInfo>, ctx: ServiceContext): Promise<unknown> };
const referenceResolver = (entity: GlobalIdType, Resolver: Loadable) => (
  reference: { id: string }, ctx: ServiceContext, info: GraphQLResolveInfo
) => {
  requireStorefrontPermission(ctx.storefrontAccess, STOREFRONT_PERMISSIONS.REVIEWS_READ);
  return Resolver.load(decodeGlobalIdByType(reference.id, entity), parseGraphqlInfo(info), ctx);
};

const nodeTypes = new Map<Function, string>([
  [StoreConfigurationResolver, "ReviewStoreConfiguration"],
  [RatingCriterionResolver, "ReviewRatingCriterion"],
  [RatingCriterionAssignmentResolver, "ReviewRatingCriterionAssignment"],
  [ReviewResolver, "Review"], [ReviewMediaResolver, "ReviewMedia"], [ReviewReplyResolver, "ReviewReply"],
  [ProductQuestionResolver, "ProductQuestion"], [ProductQuestionAnswerResolver, "ProductQuestionAnswer"],
  [QuestionSubscriptionResolver, "ProductQuestionSubscription"], [ContentTranslationResolver, "ReviewContentTranslation"],
  [ContentPublicationResolver, "ReviewContentPublication"],
  [ContentVoteResolver, "ReviewContentVote"], [ContentReportResolver, "ReviewContentReport"],
  [ReviewRequestResolver, "ReviewRequest"], [ReviewRequestEventResolver, "ReviewRequestEvent"],
  [ModerationCaseResolver, "ReviewModerationCase"], [ModerationEventResolver, "ReviewModerationEvent"],
  [ContentRevisionResolver, "ReviewContentRevision"], [ModerationSignalResolver, "ReviewModerationSignal"],
  [ContentExternalReferenceResolver, "ReviewContentExternalReference"],
]);
const resolveNodeType = (value: unknown) => value && typeof value === "object"
  ? nodeTypes.get((value as object).constructor) ?? (value as { __typename?: string }).__typename ?? null
  : null;

export const typeResolvers: Partial<Resolvers> = {
  Node: { __resolveType: resolveNodeType },
  ReviewContent: { __resolveType: resolveNodeType },
  ReviewRatingCriterionTarget: { __resolveType: (value) => {
    const type = (value as { __typename?: string })?.__typename;
    return type === "Product" || type === "Category" ? type : null;
  } },
  Media: { __resolveType: (value) => {
    const type = (value as { __typename?: string })?.__typename;
    return type === "MediaImage" || type === "Video" || type === "ExternalVideo" || type === "Model3d" ? type : null;
  } },
  DisplayableError: { __resolveType: () => "ReviewUserError" },
  Product: { __resolveReference: referenceResolver(GlobalIdEntity.Product, ProductFederationResolver) },
  ProductVariant: { __resolveReference: referenceResolver(GlobalIdEntity.ProductVariant, ProductVariantFederationResolver) },
  Customer: { __resolveReference: referenceResolver(GlobalIdEntity.Customer, CustomerFederationResolver) },
  ReviewStoreConfiguration: { __resolveReference: async (reference, ctx, info) => {
    requireStorefrontPermission(ctx.storefrontAccess, STOREFRONT_PERMISSIONS.REVIEWS_READ);
    const id = decodeGlobalIdByType(reference.id, GlobalIdEntity.ReviewStoreConfiguration);
    const row = await ctx.kernel.repository.configuration.findStoreConfiguration();
    return row?.id === id ? StoreConfigurationResolver.load(row, parseGraphqlInfo(info), ctx) : null;
  } },
  ReviewRatingCriterion: { __resolveReference: referenceResolver(GlobalIdEntity.ReviewRatingCriterion, RatingCriterionResolver) },
  ReviewRatingCriterionAssignment: { __resolveReference: referenceResolver(GlobalIdEntity.ReviewRatingCriterionAssignment, RatingCriterionAssignmentResolver) },
  Review: { __resolveReference: referenceResolver(GlobalIdEntity.Review, ReviewResolver) },
  ReviewMedia: { __resolveReference: referenceResolver(GlobalIdEntity.ReviewMedia, ReviewMediaResolver) },
  ReviewReply: { __resolveReference: referenceResolver(GlobalIdEntity.ReviewReply, ReviewReplyResolver) },
  ProductQuestion: { __resolveReference: referenceResolver(GlobalIdEntity.ProductQuestion, ProductQuestionResolver) },
  ProductQuestionAnswer: { __resolveReference: referenceResolver(GlobalIdEntity.ProductQuestionAnswer, ProductQuestionAnswerResolver) },
  ProductQuestionSubscription: { __resolveReference: referenceResolver(GlobalIdEntity.ProductQuestionSubscription, QuestionSubscriptionResolver) },
  ReviewContentTranslation: { __resolveReference: referenceResolver(GlobalIdEntity.ReviewContentTranslation, ContentTranslationResolver) },
  ReviewContentPublication: { __resolveReference: referenceResolver(GlobalIdEntity.ReviewContentPublication, ContentPublicationResolver) },
  ReviewContentVote: { __resolveReference: referenceResolver(GlobalIdEntity.ReviewContentVote, ContentVoteResolver) },
  ReviewContentReport: { __resolveReference: referenceResolver(GlobalIdEntity.ReviewContentReport, ContentReportResolver) },
  ReviewRequest: { __resolveReference: referenceResolver(GlobalIdEntity.ReviewRequest, ReviewRequestResolver) },
  ReviewRequestEvent: { __resolveReference: referenceResolver(GlobalIdEntity.ReviewRequestEvent, ReviewRequestEventResolver) },
  ReviewModerationCase: { __resolveReference: referenceResolver(GlobalIdEntity.ReviewModerationCase, ModerationCaseResolver) },
  ReviewModerationEvent: { __resolveReference: referenceResolver(GlobalIdEntity.ReviewModerationEvent, ModerationEventResolver) },
  ReviewContentRevision: { __resolveReference: referenceResolver(GlobalIdEntity.ReviewContentRevision, ContentRevisionResolver) },
  ReviewModerationSignal: { __resolveReference: referenceResolver(GlobalIdEntity.ReviewModerationSignal, ModerationSignalResolver) },
  ReviewContentExternalReference: { __resolveReference: referenceResolver(GlobalIdEntity.ReviewContentExternalReference, ContentExternalReferenceResolver) },
};

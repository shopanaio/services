import {
  decodeGlobalIdByType,
  GlobalIdEntity,
  type GlobalIdType,
} from "@shopana/shared-graphql-guid";
import { parseGraphqlInfo } from "@shopana/type-resolver";
import type { GraphQLResolveInfo } from "graphql";
import type { ServiceContext } from "../../../context/types.js";
import {
  RatingCriterionAssignmentResolver,
  RatingCriterionResolver,
  StoreConfigurationResolver,
} from "../../../resolvers/admin/ConfigurationResolver.js";
import {
  ContentPublicationResolver,
  ContentTranslationResolver,
} from "../../../resolvers/admin/ContentResolver.js";
import {
  ContentReportResolver,
  ContentVoteResolver,
} from "../../../resolvers/admin/EngagementResolver.js";
import { ContentExternalReferenceResolver } from "../../../resolvers/admin/ExternalReferenceResolver.js";
import {
  ContentRevisionResolver,
  ModerationCaseResolver,
  ModerationEventResolver,
  ModerationSignalResolver,
} from "../../../resolvers/admin/ModerationResolver.js";
import {
  ProductQuestionAnswerResolver,
  ProductQuestionResolver,
  QuestionSubscriptionResolver,
} from "../../../resolvers/admin/QuestionResolver.js";
import {
  ReviewMediaResolver,
  ReviewReplyResolver,
  ReviewResolver,
} from "../../../resolvers/admin/ReviewResolver.js";
import {
  ReviewRequestEventResolver,
  ReviewRequestResolver,
} from "../../../resolvers/admin/ReviewRequestResolver.js";
import type { Resolvers } from "../../../resolvers/admin/generated/types.js";

type LoadableResolver = {
  load(
    value: string,
    query: ReturnType<typeof parseGraphqlInfo>,
    ctx: ServiceContext,
  ): Promise<unknown>;
};

function referenceResolver(entity: GlobalIdType, Resolver: LoadableResolver) {
  return (reference: { id: string }, ctx: ServiceContext, info: GraphQLResolveInfo) => {
    const id = decodeGlobalIdByType(reference.id, entity);
    return Resolver.load(id, parseGraphqlInfo(info), ctx);
  };
}

const nodeTypes = new Map<Function, string>([
  [StoreConfigurationResolver, "ReviewStoreConfiguration"],
  [RatingCriterionResolver, "ReviewRatingCriterion"],
  [RatingCriterionAssignmentResolver, "ReviewRatingCriterionAssignment"],
  [ReviewResolver, "Review"],
  [ReviewMediaResolver, "ReviewMedia"],
  [ReviewReplyResolver, "ReviewReply"],
  [ProductQuestionResolver, "ProductQuestion"],
  [ProductQuestionAnswerResolver, "ProductQuestionAnswer"],
  [QuestionSubscriptionResolver, "ProductQuestionSubscription"],
  [ContentTranslationResolver, "ReviewContentTranslation"],
  [ContentPublicationResolver, "ReviewContentPublication"],
  [ContentVoteResolver, "ReviewContentVote"],
  [ContentReportResolver, "ReviewContentReport"],
  [ModerationCaseResolver, "ReviewModerationCase"],
  [ModerationEventResolver, "ReviewModerationEvent"],
  [ContentRevisionResolver, "ReviewContentRevision"],
  [ModerationSignalResolver, "ReviewModerationSignal"],
  [ContentExternalReferenceResolver, "ReviewContentExternalReference"],
  [ReviewRequestResolver, "ReviewRequest"],
  [ReviewRequestEventResolver, "ReviewRequestEvent"],
]);

function resolveNodeType(value: unknown): string | null {
  if (value && typeof value === "object") {
    const byClass = nodeTypes.get((value as object).constructor);
    if (byClass) return byClass;

    const record = value as Record<string, unknown>;
    if (typeof record.__typename === "string") return record.__typename;
    switch (record.kind) {
      case "REVIEW":
        return "Review";
      case "REVIEW_REPLY":
        return "ReviewReply";
      case "PRODUCT_QUESTION":
        return "ProductQuestion";
      case "QUESTION_ANSWER":
        return "ProductQuestionAnswer";
    }
  }
  return null;
}

export const typeResolvers = {
  Node: { __resolveType: resolveNodeType },
  ReviewContent: { __resolveType: resolveNodeType },
  ReviewRatingCriterionTarget: {
    __resolveType: (value: unknown) => {
      const typeName = (value as { __typename?: string })?.__typename;
      return typeName === "Product" || typeName === "Category" ? typeName : null;
    },
  },
  UserError: { __resolveType: () => "GenericUserError" },

  ReviewStoreConfiguration: {
    __resolveReference: async (
      reference: { id: string },
      ctx: ServiceContext,
      info: GraphQLResolveInfo,
    ) => {
      const id = decodeGlobalIdByType(reference.id, GlobalIdEntity.ReviewStoreConfiguration);
      const row = await ctx.kernel.repository.configuration.findStoreConfiguration();
      if (!row || row.id !== id) return null;
      return StoreConfigurationResolver.load(row, parseGraphqlInfo(info), ctx);
    },
  },
  ReviewRatingCriterion: {
    __resolveReference: referenceResolver(
      GlobalIdEntity.ReviewRatingCriterion,
      RatingCriterionResolver,
    ),
  },
  ReviewRatingCriterionAssignment: {
    __resolveReference: referenceResolver(
      GlobalIdEntity.ReviewRatingCriterionAssignment,
      RatingCriterionAssignmentResolver,
    ),
  },
  Review: {
    __resolveReference: referenceResolver(GlobalIdEntity.Review, ReviewResolver),
  },
  ReviewMedia: {
    __resolveReference: referenceResolver(GlobalIdEntity.ReviewMedia, ReviewMediaResolver),
  },
  ReviewReply: {
    __resolveReference: referenceResolver(GlobalIdEntity.ReviewReply, ReviewReplyResolver),
  },
  ProductQuestion: {
    __resolveReference: referenceResolver(GlobalIdEntity.ProductQuestion, ProductQuestionResolver),
  },
  ProductQuestionAnswer: {
    __resolveReference: referenceResolver(
      GlobalIdEntity.ProductQuestionAnswer,
      ProductQuestionAnswerResolver,
    ),
  },
  ProductQuestionSubscription: {
    __resolveReference: referenceResolver(
      GlobalIdEntity.ProductQuestionSubscription,
      QuestionSubscriptionResolver,
    ),
  },
  ReviewContentTranslation: {
    __resolveReference: referenceResolver(
      GlobalIdEntity.ReviewContentTranslation,
      ContentTranslationResolver,
    ),
  },
  ReviewContentPublication: {
    __resolveReference: referenceResolver(
      GlobalIdEntity.ReviewContentPublication,
      ContentPublicationResolver,
    ),
  },
  ReviewContentVote: {
    __resolveReference: referenceResolver(GlobalIdEntity.ReviewContentVote, ContentVoteResolver),
  },
  ReviewContentReport: {
    __resolveReference: referenceResolver(
      GlobalIdEntity.ReviewContentReport,
      ContentReportResolver,
    ),
  },
  ReviewModerationCase: {
    __resolveReference: referenceResolver(
      GlobalIdEntity.ReviewModerationCase,
      ModerationCaseResolver,
    ),
  },
  ReviewModerationEvent: {
    __resolveReference: referenceResolver(
      GlobalIdEntity.ReviewModerationEvent,
      ModerationEventResolver,
    ),
  },
  ReviewContentRevision: {
    __resolveReference: referenceResolver(
      GlobalIdEntity.ReviewContentRevision,
      ContentRevisionResolver,
    ),
  },
  ReviewModerationSignal: {
    __resolveReference: referenceResolver(
      GlobalIdEntity.ReviewModerationSignal,
      ModerationSignalResolver,
    ),
  },
  ReviewContentExternalReference: {
    __resolveReference: referenceResolver(
      GlobalIdEntity.ReviewContentExternalReference,
      ContentExternalReferenceResolver,
    ),
  },
  ReviewRequest: {
    __resolveReference: referenceResolver(GlobalIdEntity.ReviewRequest, ReviewRequestResolver),
  },
  ReviewRequestEvent: {
    __resolveReference: referenceResolver(
      GlobalIdEntity.ReviewRequestEvent,
      ReviewRequestEventResolver,
    ),
  },
} as unknown as Partial<Resolvers>;

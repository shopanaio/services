import {
  BaseType,
  createAuthorizationMiddleware,
  createExecutor,
  type Authorizable,
  type CacheStore,
  type Middleware,
} from "@shopana/type-resolver";
import {
  decodeGlobalIdByType,
  encodeGlobalIdByType,
  type GlobalIdType,
} from "@shopana/shared-graphql-guid";
import type { ServiceContext } from "../../context/types.js";
import { requireStorefrontPermission, STOREFRONT_PERMISSIONS } from "@shopana/shared-context";
import { AuthProvider } from "../../kernel/Authorizable.js";
import { getResolverRegistry, type ResolverRegistry } from "./ResolverRegistry.js";

const graphqlTypeByResolver = new Map<string, string>([
  ["StoreConfigurationResolver", "ReviewStoreConfiguration"],
  ["RatingCriterionResolver", "ReviewRatingCriterion"],
  ["RatingCriterionAssignmentResolver", "ReviewRatingCriterionAssignment"],
  ["ReviewResolver", "Review"],
  ["ReviewMediaResolver", "ReviewMedia"],
  ["ReviewReplyResolver", "ReviewReply"],
  ["ProductQuestionResolver", "ProductQuestion"],
  ["ProductQuestionAnswerResolver", "ProductQuestionAnswer"],
  ["QuestionSubscriptionResolver", "ProductQuestionSubscription"],
  ["ContentTranslationResolver", "ReviewContentTranslation"],
  ["ContentPublicationResolver", "ReviewContentPublication"],
  ["ContentVoteResolver", "ReviewContentVote"],
  ["ContentReportResolver", "ReviewContentReport"],
  ["ReviewRequestResolver", "ReviewRequest"],
  ["ReviewRequestEventResolver", "ReviewRequestEvent"],
  ["ModerationCaseResolver", "ReviewModerationCase"],
  ["ModerationEventResolver", "ReviewModerationEvent"],
  ["ContentRevisionResolver", "ReviewContentRevision"],
  ["ModerationSignalResolver", "ReviewModerationSignal"],
  ["ContentExternalReferenceResolver", "ReviewContentExternalReference"],
]);

const graphqlTypeMiddleware: Middleware<ServiceContext> = {
  name: "reviews-storefront-graphql-type",
  async afterLoad({ Type, result }) {
    const typeName = graphqlTypeByResolver.get(Type.name);
    if (typeName) result.__typename = typeName;
  },
};

export abstract class ReviewsType<TValue, TData = unknown>
  extends BaseType<TValue, TData, ServiceContext>
  implements Authorizable
{
  readonly authProvider = new AuthProvider();
  static executor = createExecutor<ServiceContext>({
    middleware: [createAuthorizationMiddleware(), graphqlTypeMiddleware],
  });

  protected get resolvers(): ResolverRegistry {
    return getResolverRegistry(this.$ctx);
  }
  protected getCache(): CacheStore {
    return this.$ctx.kernel.cache as CacheStore;
  }
  protected encodeId(id: string, type: GlobalIdType) {
    return encodeGlobalIdByType(id, type);
  }
  protected decodeId(id: string, type: GlobalIdType) {
    return decodeGlobalIdByType(id, type);
  }
  protected requireReadPermission() {
    requireStorefrontPermission(this.$ctx.storefrontAccess, STOREFRONT_PERMISSIONS.REVIEWS_READ);
  }
  protected requireWritePermission() {
    requireStorefrontPermission(this.$ctx.storefrontAccess, STOREFRONT_PERMISSIONS.REVIEWS_WRITE);
  }
}

export { Cache } from "@shopana/type-resolver";

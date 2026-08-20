import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { ApolloQuery } from "@shopana/type-resolver";
import { StoreConfigurationResolver } from "./ConfigurationResolver.js";
import { isContentVisible } from "./ContentResolver.js";
import { ReviewsType } from "./ReviewsType.js";

@ApolloQuery
export class QueryResolver extends ReviewsType<Record<string, never>> {
  async reviewStoreConfiguration() {
    this.requireReadPermission();
    const row = await this.$ctx.kernel.repository.configuration.findStoreConfiguration();
    return row ? new StoreConfigurationResolver(row, this.$ctx) : null;
  }
  async review(args: { id: string }) {
    this.requireReadPermission();
    return this.visibleContent(args.id, GlobalIdEntity.Review, "REVIEW");
  }
  async productQuestion(args: { id: string }) {
    this.requireReadPermission();
    return this.visibleContent(args.id, GlobalIdEntity.ProductQuestion, "PRODUCT_QUESTION");
  }
  async reviewReply(args: { id: string }) {
    this.requireReadPermission();
    return this.visibleContent(args.id, GlobalIdEntity.ReviewReply, "REVIEW_REPLY", true);
  }
  async productQuestionAnswer(args: { id: string }) {
    this.requireReadPermission();
    return this.visibleContent(
      args.id,
      GlobalIdEntity.ProductQuestionAnswer,
      "QUESTION_ANSWER",
      true,
    );
  }
  async reviewRequest(args: { id: string }) {
    this.requireReadPermission();
    const customerId = this.$ctx.customer?.id;
    if (!customerId) return null;
    const id = this.decodeId(args.id, GlobalIdEntity.ReviewRequest);
    const row = await this.$ctx.loaders.reviewRequest.load(id);
    return row?.customerId === customerId ? this.resolvers.reviewRequest(id) : null;
  }

  private async visibleContent(
    id: string,
    type: GlobalIdEntity,
    kind: string,
    publishedOnly = false,
  ) {
    const decoded = this.decodeId(id, type);
    const row = await this.$ctx.loaders.content.load(decoded);
    if (!row || row.kind !== kind) return null;
    if (
      publishedOnly
        ? row.status !== "PUBLISHED" || row.deletedAt || row.redactedAt
        : !isContentVisible(row, this.$ctx.customer?.id)
    )
      return null;
    return this.resolvers.content(decoded);
  }
}

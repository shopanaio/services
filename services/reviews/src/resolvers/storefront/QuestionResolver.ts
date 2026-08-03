import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { PreloadNotFoundError, SubgraphReference } from "@shopana/type-resolver";
import type { ProductQuestion, QuestionAnswer, QuestionSubscription } from "../../repositories/models/index.js";
import type { ProductQuestionAnswerConnectionInput } from "../../repositories/question/ProductQuestionAnswerRepository.js";
import { ContentResolver } from "./ContentResolver.js";
import { ProductQuestionAnswerConnectionResolver } from "./QuestionConnectionResolver.js";
import { ReviewsType } from "./ReviewsType.js";
import { customerReference, productReference, variantReference } from "./references.js";

@SubgraphReference()
export class ProductQuestionResolver extends ContentResolver<ProductQuestion> {
  async $preload() { const row = await this.$ctx.loaders.productQuestion.load(this.$props); if (!row) throw new PreloadNotFoundError("Product question not found"); await this.loadContent(); return row; }
  async product() { return productReference(await this.$get("productId")); }
  async variant() { return variantReference(await this.$get("variantId")); }
  answers(args: ProductQuestionAnswerConnectionInput) { return new ProductQuestionAnswerConnectionResolver({ ...args, questionId: this.$props }, this.$ctx); }
  async viewerSubscription() {
    const customerId = this.$ctx.customer?.id;
    if (!customerId) return null;
    const row = await this.$ctx.kernel.repository.questionSubscription.findByCustomer(this.$props, customerId);
    return row ? this.resolvers.questionSubscription(row.id) : null;
  }
}
@SubgraphReference()
export class ProductQuestionAnswerResolver extends ContentResolver<QuestionAnswer> {
  async $preload() { const row = await this.$ctx.loaders.productQuestionAnswer.load(this.$props); if (!row) throw new PreloadNotFoundError("Product question answer not found"); await this.loadContent(); return row; }
  async question() { return this.resolvers.productQuestion(await this.$get("questionId")); }
  isOfficial() { return this.$get("isOfficial"); }
  isAccepted() { return this.$get("isAccepted"); }
  sortIndex() { return this.$get("sortIndex"); }
}
@SubgraphReference()
export class QuestionSubscriptionResolver extends ReviewsType<string, QuestionSubscription> {
  async $preload() {
    const row = await this.$ctx.loaders.questionSubscription.load(this.$props);
    if (!row || row.subscriberCustomerId !== this.$ctx.customer?.id) throw new PreloadNotFoundError("Question subscription not found");
    return row;
  }
  id() { return this.encodeId(this.$props, GlobalIdEntity.ProductQuestionSubscription); }
  async question() { return this.resolvers.productQuestion(await this.$get("questionId")); }
  async subscriberCustomer() { return customerReference(await this.$get("subscriberCustomerId")); }
  channel() { return this.$get("channel"); }
  status() { return this.$get("status"); }
  locale() { return this.$get("locale"); }
  lastNotifiedAt() { return this.$get("lastNotifiedAt"); }
  createdAt() { return this.$get("createdAt"); }
  updatedAt() { return this.$get("updatedAt"); }
}

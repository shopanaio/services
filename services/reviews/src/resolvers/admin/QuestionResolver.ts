import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { PreloadNotFoundError, SubgraphReference } from "@shopana/type-resolver";
import type {
  ProductQuestion,
  QuestionAnswer,
  QuestionSubscription,
} from "../../repositories/models/index.js";
import type { ProductQuestionAnswerConnectionInput } from "../../repositories/question/ProductQuestionAnswerRepository.js";
import type { QuestionSubscriptionRelayInput } from "../../repositories/question/QuestionSubscriptionRepository.js";
import { ContentResolver } from "./ContentResolver.js";
import {
  ProductQuestionAnswerConnectionResolver,
  QuestionSubscriptionConnectionResolver,
} from "./QuestionConnectionResolver.js";
import { ReviewsType } from "./ReviewsType.js";
import {
  customerReference,
  productReference,
  variantReference,
} from "./references.js";

@SubgraphReference()
export class ProductQuestionResolver extends ContentResolver<ProductQuestion> {
  async $preload() {
    const question = await this.$ctx.loaders.productQuestion.load(this.$props);
    if (!question) {
      throw new PreloadNotFoundError(
        `Product question with ID ${this.$props} not found`
      );
    }
    return question;
  }

  async product() { return productReference(await this.$get("productId")); }
  async variant() { return variantReference(await this.$get("variantId")); }

  async answerState() {
    const metrics = await this.$ctx.loaders.contentMetrics.load(this.$props);
    return (metrics?.childCount ?? 0) > 0 ? "ANSWERED" : "UNANSWERED";
  }

  answers(args: ProductQuestionAnswerConnectionInput) {
    return new ProductQuestionAnswerConnectionResolver(
      { ...args, questionId: this.$props },
      this.$ctx
    );
  }

  subscriptions(args: QuestionSubscriptionRelayInput) {
    return new QuestionSubscriptionConnectionResolver(
      { ...args, questionId: this.$props },
      this.$ctx
    );
  }
}

@SubgraphReference()
export class ProductQuestionAnswerResolver extends ContentResolver<QuestionAnswer> {
  async $preload() {
    const answer = await this.$ctx.loaders.productQuestionAnswer.load(
      this.$props
    );
    if (!answer) {
      throw new PreloadNotFoundError(
        `Product question answer with ID ${this.$props} not found`
      );
    }
    return answer;
  }

  async question() {
    return this.resolvers.productQuestion(await this.$get("questionId"));
  }
  isOfficial() { return this.$get("isOfficial"); }
  isAccepted() { return this.$get("isAccepted"); }
  sortIndex() { return this.$get("sortIndex"); }
}

@SubgraphReference()
export class QuestionSubscriptionResolver extends ReviewsType<
  string,
  QuestionSubscription
> {
  async $preload() {
    const subscription = await this.$ctx.loaders.questionSubscription.load(
      this.$props
    );
    if (!subscription) {
      throw new PreloadNotFoundError(
        `Product question subscription with ID ${this.$props} not found`
      );
    }
    return subscription;
  }

  id() {
    return this.encodeId(
      this.$props,
      GlobalIdEntity.ProductQuestionSubscription
    );
  }
  async question() { return this.resolvers.productQuestion(await this.$get("questionId")); }
  async subscriberCustomer() { return customerReference(await this.$get("subscriberCustomerId")); }
  channel() { return this.$get("channel"); }
  status() { return this.$get("status"); }
  locale() { return this.$get("locale"); }
  lastNotifiedAt() { return this.$get("lastNotifiedAt"); }
  createdAt() { return this.$get("createdAt"); }
  updatedAt() { return this.$get("updatedAt"); }
}

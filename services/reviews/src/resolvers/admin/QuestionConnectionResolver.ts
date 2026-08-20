import type { ProductQuestionAnswerConnectionInput } from "../../repositories/question/ProductQuestionAnswerRepository.js";
import type { ProductQuestionConnectionInput } from "../../repositories/question/ProductQuestionRepository.js";
import type { QuestionSubscriptionRelayInput } from "../../repositories/question/QuestionSubscriptionRepository.js";
import {
  BaseConnectionResolver,
  type ConnectionData,
} from "./connection/BaseConnectionResolver.js";

export class ProductQuestionConnectionResolver extends BaseConnectionResolver<ProductQuestionConnectionInput> {
  $preload(): Promise<ConnectionData> {
    return this.$ctx.kernel.repository.productQuestion.getConnection(this.$props);
  }

  protected createNodeResolver(nodeId: string) {
    return this.resolvers.productQuestion(nodeId);
  }
}

export type ScopedProductQuestionAnswerConnectionInput = ProductQuestionAnswerConnectionInput & {
  questionId?: string;
};

export class ProductQuestionAnswerConnectionResolver extends BaseConnectionResolver<ScopedProductQuestionAnswerConnectionInput> {
  $preload(): Promise<ConnectionData> {
    const { questionId, where, ...args } = this.$props;
    return this.$ctx.kernel.repository.productQuestionAnswer.getConnection({
      ...args,
      where: questionId
        ? {
            _and: [{ questionId: { _eq: questionId } }, ...(where ? [where] : [])],
          }
        : where,
    });
  }

  protected createNodeResolver(nodeId: string) {
    return this.resolvers.productQuestionAnswer(nodeId);
  }
}

type QuestionSubscriptionConnectionInput = QuestionSubscriptionRelayInput & {
  questionId: string;
};

export class QuestionSubscriptionConnectionResolver extends BaseConnectionResolver<QuestionSubscriptionConnectionInput> {
  $preload(): Promise<ConnectionData> {
    const { questionId, ...args } = this.$props;
    return this.$ctx.kernel.repository.questionSubscription.getConnection(questionId, args);
  }

  protected createNodeResolver(nodeId: string) {
    return this.resolvers.questionSubscription(nodeId);
  }
}

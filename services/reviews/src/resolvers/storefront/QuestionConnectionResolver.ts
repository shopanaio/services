import type {
  ProductQuestionAnswerConnectionInput,
  ProductQuestionAnswerRelayInput,
} from "../../repositories/question/ProductQuestionAnswerRepository.js";
import type {
  ProductQuestionConnectionInput,
  ProductQuestionRelayInput,
} from "../../repositories/question/ProductQuestionRepository.js";
import {
  BaseConnectionResolver,
  type ConnectionData,
} from "./connection/BaseConnectionResolver.js";

export type StorefrontQuestionConnectionInput = {
  first?: number | null;
  after?: string | null;
  last?: number | null;
  before?: string | null;
  productId?: string;
  variantId?: string;
  customerId?: string;
  answered?: boolean | null;
  sort?: "NEWEST" | "OLDEST" | "MOST_HELPFUL" | "MOST_ANSWERED" | null;
  includeOwnedUnpublished?: boolean;
};
export class ProductQuestionConnectionResolver extends BaseConnectionResolver<StorefrontQuestionConnectionInput> {
  $preload(): Promise<ConnectionData> {
    const {
      productId,
      variantId,
      customerId,
      answered,
      sort,
      includeOwnedUnpublished,
      ...pagination
    } = this.$props;
    const where: ProductQuestionRelayInput["where"] = {
      _and: [
        ...(includeOwnedUnpublished && customerId
          ? [{ authorCustomerId: { _eq: customerId } }]
          : [{ status: { _eq: "PUBLISHED" } }]),
        { redactedAt: { _is: null } },
        ...(productId ? [{ productId: { _eq: productId } }] : []),
        ...(variantId ? [{ variantId: { _eq: variantId } }] : []),
        ...(customerId ? [{ authorCustomerId: { _eq: customerId } }] : []),
        ...(answered == null
          ? []
          : [{ answerState: { _eq: answered ? "ANSWERED" : "UNANSWERED" } }]),
      ],
    };
    const field =
      sort === "MOST_ANSWERED"
        ? "answerCount"
        : sort === "MOST_HELPFUL"
          ? "likeCount"
          : "createdAt";
    const direction = sort === "OLDEST" ? "asc" : "desc";
    return this.$ctx.kernel.repository.productQuestion.getConnection({
      ...pagination,
      where,
      orderBy: [
        { field, direction },
        { field: "id", direction },
      ],
    } as ProductQuestionConnectionInput);
  }
  protected createNodeResolver(id: string) {
    return this.resolvers.productQuestion(id);
  }
}

export type StorefrontAnswerConnectionInput = {
  first?: number | null;
  after?: string | null;
  last?: number | null;
  before?: string | null;
  questionId: string;
  sort?: "NEWEST" | "OLDEST" | "MOST_HELPFUL" | null;
};
export class ProductQuestionAnswerConnectionResolver extends BaseConnectionResolver<StorefrontAnswerConnectionInput> {
  $preload(): Promise<ConnectionData> {
    const { questionId, sort, ...pagination } = this.$props;
    const where: ProductQuestionAnswerRelayInput["where"] = {
      _and: [
        { questionId: { _eq: questionId } },
        { status: { _eq: "PUBLISHED" } },
        { redactedAt: { _is: null } },
      ],
    };
    const direction = sort === "OLDEST" ? "asc" : "desc";
    return this.$ctx.kernel.repository.productQuestionAnswer.getConnection({
      ...pagination,
      where,
      orderBy: [
        { field: sort === "MOST_HELPFUL" ? "likeCount" : "createdAt", direction },
        { field: "id", direction },
      ],
    } as ProductQuestionAnswerConnectionInput);
  }
  protected createNodeResolver(id: string) {
    return this.resolvers.productQuestionAnswer(id);
  }
}

import type { SortFieldMapping, UsePageConfigReturn } from "@/hooks";
import type { ApiProductQuestionOrderByInput, ApiProductQuestionWhereInput } from "@/graphql/types";
import { ProductQuestionOrderField } from "@/graphql/types";
import type { QuestionsQueryVariables } from "../graphql/operation-types";

export const questionSortFieldMapping: SortFieldMapping<ProductQuestionOrderField> = {
  answerCount: ProductQuestionOrderField.AnswerCount,
  createdAt: ProductQuestionOrderField.CreatedAt,
  reportCount: ProductQuestionOrderField.ReportCount,
  status: ProductQuestionOrderField.Status,
  updatedAt: ProductQuestionOrderField.UpdatedAt,
};

export const buildQuestionSearchCondition = (
  search: string,
): Partial<ApiProductQuestionWhereInput> => ({
  _or: [{ body: { _containsi: search } }],
});

export function buildQuestionsQueryVariables(
  pageConfig: Pick<
    UsePageConfigReturn<ApiProductQuestionWhereInput, ProductQuestionOrderField>,
    "first" | "after" | "last" | "before" | "where" | "orderBy"
  >,
): QuestionsQueryVariables {
  return {
    first: pageConfig.first,
    after: pageConfig.after,
    last: pageConfig.last,
    before: pageConfig.before,
    where: pageConfig.where ?? null,
    orderBy: pageConfig.orderBy?.map((order) => ({
      field: order.field,
      direction: order.direction,
    })) as ApiProductQuestionOrderByInput[] | undefined,
  };
}

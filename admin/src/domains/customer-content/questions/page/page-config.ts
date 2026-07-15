import type { SortFieldMapping, UsePageConfigReturn } from "@/hooks";
import { SortDirection } from "@/graphql/types";
import type { QuestionOrderByInput, QuestionsQueryVariables, QuestionWhereInput } from "../graphql/operation-types";
import { QuestionOrderField } from "../graphql/operation-types";

export const questionSortFieldMapping: SortFieldMapping<QuestionOrderField> = {
  answerCount: QuestionOrderField.AnswerCount,
  createdAt: QuestionOrderField.CreatedAt,
  dislikeCount: QuestionOrderField.DislikeCount,
  likeCount: QuestionOrderField.LikeCount,
  reportedCount: QuestionOrderField.ReportedCount,
  status: QuestionOrderField.Status,
  updatedAt: QuestionOrderField.UpdatedAt,
};

export const buildQuestionSearchCondition = (search: string): Partial<QuestionWhereInput> => ({
  _or: [{ body: { _containsi: search } }],
});

export function buildQuestionsQueryVariables(
  pageConfig: Pick<UsePageConfigReturn<QuestionWhereInput, QuestionOrderField>, "first" | "after" | "last" | "before" | "where" | "orderBy">,
): QuestionsQueryVariables {
  return {
    first: pageConfig.first,
    after: pageConfig.after,
    last: pageConfig.last,
    before: pageConfig.before,
    where: pageConfig.where ?? null,
    orderBy: pageConfig.orderBy?.map((order) => ({
      field: order.field,
      direction: order.direction === SortDirection.Asc ? "ASC" : "DESC",
    })) as QuestionOrderByInput[] | undefined,
  };
}

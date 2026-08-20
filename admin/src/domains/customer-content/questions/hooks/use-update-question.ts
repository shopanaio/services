"use client";

import { useCallback } from "react";
import { useApolloClient, useMutation } from "@apollo/client/react";
import type {
  ApiGenericUserError,
  ApiProductQuestion,
  ApiProductQuestionUpdateInput,
} from "@/graphql/types";
import { QUESTION_UPDATE_MUTATION, QUESTIONS_QUERY } from "../graphql";
import type {
  QuestionUpdateMutationData,
  QuestionUpdateMutationVariables,
} from "../graphql/operation-types";
import type { QuestionAnswerMutationPlan } from "../mappers/question-form.mapper";

export function useUpdateQuestion() {
  const client = useApolloClient();
  const [updateQuestionMutation, questionState] = useMutation<
    QuestionUpdateMutationData,
    QuestionUpdateMutationVariables
  >(QUESTION_UPDATE_MUTATION);

  const updateQuestion = useCallback(
    async (
      productQuestionId: string,
      expectedRevision: number,
      operations: ApiProductQuestionUpdateInput,
      answerPlan: QuestionAnswerMutationPlan,
    ): Promise<{
      question: ApiProductQuestion | null;
      userErrors: ApiGenericUserError[];
    }> => {
      let question: ApiProductQuestion | null = null;
      try {
        const hasAnswerChanges =
          answerPlan.create.length > 0 ||
          answerPlan.update.length > 0 ||
          answerPlan.delete.length > 0;
        const result = await updateQuestionMutation({
          variables: {
            productQuestionId,
            expectedRevision,
            operations: hasAnswerChanges ? { ...operations, answers: answerPlan } : operations,
          },
        });
        const payload = result.data?.reviewsMutation.productQuestionUpdate;
        question = payload?.productQuestion ?? null;
        const userErrors = [
          ...(payload?.userErrors ?? []),
          ...(payload?.operationResults.flatMap((item) => item.errors) ?? []),
        ];
        if (!question || userErrors.length > 0) return { question, userErrors };

        await client.refetchQueries({ include: [QUESTIONS_QUERY] });
        return { question, userErrors };
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : "Unable to update question";
        return {
          question,
          userErrors: [{ code: "UNEXPECTED_ERROR", message }] as ApiGenericUserError[],
        };
      }
    },
    [client, updateQuestionMutation],
  );

  return {
    updateQuestion,
    loading: questionState.loading,
    error: questionState.error ?? null,
    reset: questionState.reset,
  };
}

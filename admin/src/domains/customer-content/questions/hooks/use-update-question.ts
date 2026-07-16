"use client";

import { useCallback } from "react";
import { useApolloClient, useMutation } from "@apollo/client/react";
import type {
  ApiGenericUserError,
  ApiProductQuestion,
  ApiProductQuestionUpdateInput,
} from "@/graphql/types";
import {
  QUESTION_ANSWER_CREATE_MUTATION,
  QUESTION_ANSWER_DELETE_MUTATION,
  QUESTION_ANSWER_UPDATE_MUTATION,
  QUESTION_UPDATE_MUTATION,
  QUESTIONS_QUERY,
} from "../graphql";
import type {
  QuestionAnswerCreateMutationData,
  QuestionAnswerCreateMutationVariables,
  QuestionAnswerDeleteMutationData,
  QuestionAnswerDeleteMutationVariables,
  QuestionAnswerUpdateMutationData,
  QuestionAnswerUpdateMutationVariables,
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
  const [createAnswerMutation, createState] = useMutation<
    QuestionAnswerCreateMutationData,
    QuestionAnswerCreateMutationVariables
  >(QUESTION_ANSWER_CREATE_MUTATION);
  const [updateAnswerMutation, updateState] = useMutation<
    QuestionAnswerUpdateMutationData,
    QuestionAnswerUpdateMutationVariables
  >(QUESTION_ANSWER_UPDATE_MUTATION);
  const [deleteAnswerMutation, deleteState] = useMutation<
    QuestionAnswerDeleteMutationData,
    QuestionAnswerDeleteMutationVariables
  >(QUESTION_ANSWER_DELETE_MUTATION);

  const updateQuestion = useCallback(async (
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
      const result = await updateQuestionMutation({
        variables: { productQuestionId, expectedRevision, operations },
      });
      const payload = result.data?.reviewsMutation.productQuestionUpdate;
      question = payload?.productQuestion ?? null;
      const userErrors = [
        ...(payload?.userErrors ?? []),
        ...(payload?.operationResults.flatMap((item) => item.errors) ?? []),
      ];
      if (!question || userErrors.length > 0) return { question, userErrors };

      for (const input of answerPlan.create) {
        const answerResult = await createAnswerMutation({ variables: { input } });
        userErrors.push(
          ...(answerResult.data?.reviewsMutation.productQuestionAnswerCreate.userErrors ?? []),
        );
      }
      for (const variables of answerPlan.update) {
        const answerResult = await updateAnswerMutation({ variables });
        const answerPayload = answerResult.data?.reviewsMutation.productQuestionAnswerUpdate;
        userErrors.push(
          ...(answerPayload?.userErrors ?? []),
          ...(answerPayload?.operationResults.flatMap((item) => item.errors) ?? []),
        );
      }
      for (const input of answerPlan.delete) {
        const answerResult = await deleteAnswerMutation({ variables: { input } });
        userErrors.push(
          ...(answerResult.data?.reviewsMutation.productQuestionAnswerDelete.userErrors ?? []),
        );
      }

      await client.refetchQueries({ include: [QUESTIONS_QUERY] });
      return { question, userErrors };
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Unable to update question";
      return {
        question,
        userErrors: [{ code: "UNEXPECTED_ERROR", message }] as ApiGenericUserError[],
      };
    }
  }, [client, createAnswerMutation, deleteAnswerMutation, updateAnswerMutation, updateQuestionMutation]);

  return {
    updateQuestion,
    loading: questionState.loading || createState.loading || updateState.loading || deleteState.loading,
    error: questionState.error ?? createState.error ?? updateState.error ?? deleteState.error ?? null,
    reset: () => {
      questionState.reset();
      createState.reset();
      updateState.reset();
      deleteState.reset();
    },
  };
}

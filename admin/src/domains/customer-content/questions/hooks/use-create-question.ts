"use client";

import { useCallback } from "react";
import { useApolloClient, useMutation } from "@apollo/client/react";
import type {
  ApiGenericUserError,
  ApiProductQuestion,
  ApiProductQuestionAnswerCreateOperationInput,
  ApiProductQuestionCreateInput,
} from "@/graphql/types";
import {
  QUESTION_CREATE_MUTATION,
  QUESTION_UPDATE_MUTATION,
  QUESTIONS_QUERY,
} from "../graphql";
import type {
  QuestionCreateMutationData,
  QuestionCreateMutationVariables,
  QuestionUpdateMutationData,
  QuestionUpdateMutationVariables,
} from "../graphql/operation-types";

export function useCreateQuestion() {
  const client = useApolloClient();
  const [createQuestionMutation, questionState] = useMutation<
    QuestionCreateMutationData,
    QuestionCreateMutationVariables
  >(QUESTION_CREATE_MUTATION);
  const [updateQuestionMutation, answersState] = useMutation<
    QuestionUpdateMutationData,
    QuestionUpdateMutationVariables
  >(QUESTION_UPDATE_MUTATION);

  const createQuestion = useCallback(async (
    input: ApiProductQuestionCreateInput,
    answers: ApiProductQuestionAnswerCreateOperationInput[] = [],
  ): Promise<{
    question: ApiProductQuestion | null;
    userErrors: ApiGenericUserError[];
  }> => {
    let question: ApiProductQuestion | null = null;
    try {
      const result = await createQuestionMutation({ variables: { input } });
      const payload = result.data?.reviewsMutation.productQuestionCreate;
      question = payload?.productQuestion ?? null;
      const userErrors = [...(payload?.userErrors ?? [])];
      if (!question || userErrors.length > 0) return { question, userErrors };

      if (answers.length > 0) {
        const answerResult = await updateQuestionMutation({
          variables: {
            productQuestionId: question.id,
            expectedRevision: question.revision,
            operations: { answers: { create: answers } },
          },
        });
        const answerPayload = answerResult.data?.reviewsMutation.productQuestionUpdate;
        question = answerPayload?.productQuestion ?? question;
        userErrors.push(
          ...(answerPayload?.userErrors ?? []),
          ...(answerPayload?.operationResults.flatMap((item) => item.errors) ?? []),
        );
      }

      await client.refetchQueries({ include: [QUESTIONS_QUERY] });
      return { question, userErrors };
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Unable to create question";
      return {
        question,
        userErrors: [{ code: "UNEXPECTED_ERROR", message }] as ApiGenericUserError[],
      };
    }
  }, [client, createQuestionMutation, updateQuestionMutation]);

  return {
    createQuestion,
    loading: questionState.loading || answersState.loading,
    error: questionState.error ?? answersState.error ?? null,
    reset: () => {
      questionState.reset();
      answersState.reset();
    },
  };
}

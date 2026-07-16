"use client";

import { useCallback } from "react";
import { useApolloClient, useMutation } from "@apollo/client/react";
import type {
  ApiGenericUserError,
  ApiProductQuestion,
  ApiProductQuestionAnswerCreateInput,
  ApiProductQuestionCreateInput,
} from "@/graphql/types";
import {
  QUESTION_ANSWER_CREATE_MUTATION,
  QUESTION_CREATE_MUTATION,
  QUESTIONS_QUERY,
} from "../graphql";
import type {
  QuestionAnswerCreateMutationData,
  QuestionAnswerCreateMutationVariables,
  QuestionCreateMutationData,
  QuestionCreateMutationVariables,
} from "../graphql/operation-types";

export function useCreateQuestion() {
  const client = useApolloClient();
  const [createQuestionMutation, questionState] = useMutation<
    QuestionCreateMutationData,
    QuestionCreateMutationVariables
  >(QUESTION_CREATE_MUTATION);
  const [createAnswerMutation, answerState] = useMutation<
    QuestionAnswerCreateMutationData,
    QuestionAnswerCreateMutationVariables
  >(QUESTION_ANSWER_CREATE_MUTATION);

  const createQuestion = useCallback(async (
    input: ApiProductQuestionCreateInput,
    answers: Array<Omit<ApiProductQuestionAnswerCreateInput, "questionId">>,
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

      for (const answer of answers) {
        const answerResult = await createAnswerMutation({
          variables: { input: { ...answer, questionId: question.id } },
        });
        userErrors.push(
          ...(answerResult.data?.reviewsMutation.productQuestionAnswerCreate.userErrors ?? []),
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
  }, [client, createAnswerMutation, createQuestionMutation]);

  return {
    createQuestion,
    loading: questionState.loading || answerState.loading,
    error: questionState.error ?? answerState.error ?? null,
    reset: () => {
      questionState.reset();
      answerState.reset();
    },
  };
}

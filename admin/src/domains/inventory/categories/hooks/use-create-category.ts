"use client";

import { useMutation } from "@apollo/client/react";
import { useCallback } from "react";
import type { ApiCategory, ApiGenericUserError } from "@/graphql/types";
import {
  prepareCategoryPayload,
  type CreateCategoryInput,
} from "../mappers";
import { CATEGORY_CREATE_MUTATION } from "../graphql";
import type {
  CategoryCreateMutationData,
  CategoryCreateMutationVariables,
} from "../graphql/operation-types";

export type { CreateCategoryInput };

interface CreateCategoryResult {
  category: ApiCategory | null;
  userErrors: ApiGenericUserError[];
}

interface UseCreateCategoryReturn {
  createCategory: (
    input: CreateCategoryInput,
  ) => Promise<CreateCategoryResult>;
  loading: boolean;
  error: Error | null;
  reset: () => void;
}

export function useCreateCategory(): UseCreateCategoryReturn {
  const [createCategoryMutation, { loading, error, reset }] = useMutation<
    CategoryCreateMutationData,
    CategoryCreateMutationVariables
  >(CATEGORY_CREATE_MUTATION);

  const createCategory = useCallback(
    async (input: CreateCategoryInput): Promise<CreateCategoryResult> => {
      try {
        const payload = prepareCategoryPayload(input);

        const createResult = await createCategoryMutation({
          variables: {
            input: payload,
          },
        });

        const createPayload =
          createResult.data?.catalogMutation.categoryCreate;

        if (createPayload?.userErrors && createPayload.userErrors.length > 0) {
          return {
            category: null,
            userErrors: createPayload.userErrors,
          };
        }

        return {
          category: createPayload?.category ?? null,
          userErrors: [],
        };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "An unexpected error occurred";

        return {
          category: null,
          userErrors: [{ message: errorMessage, code: "UNEXPECTED_ERROR" }],
        };
      }
    },
    [createCategoryMutation],
  );

  return {
    createCategory,
    loading,
    error: error ?? null,
    reset,
  };
}

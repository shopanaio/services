"use client";

import { useCallback } from "react";
import { useMutation } from "@apollo/client/react";
import type { ApiDiscount, ApiDiscountCreateInput, ApiGenericUserError } from "@/graphql/types";
import { DISCOUNT_CREATE_MUTATION } from "../graphql";
import type {
  DiscountCreateMutationData,
  DiscountCreateMutationVariables,
} from "../graphql/operation-types";

interface CreateDiscountResult {
  discount: ApiDiscount | null;
  userErrors: ApiGenericUserError[];
}

interface UseCreateDiscountReturn {
  createDiscount: (input: ApiDiscountCreateInput) => Promise<CreateDiscountResult>;
  loading: boolean;
  error: Error | null;
  reset: () => void;
}

export function useCreateDiscount(): UseCreateDiscountReturn {
  const [createDiscountMutation, { loading, error, reset }] = useMutation<
    DiscountCreateMutationData,
    DiscountCreateMutationVariables
  >(DISCOUNT_CREATE_MUTATION);

  const createDiscount = useCallback(
    async (input: ApiDiscountCreateInput): Promise<CreateDiscountResult> => {
      try {
        const result = await createDiscountMutation({ variables: { input } });
        const payload = result.data?.pricingMutation.discountCreate;

        return {
          discount: payload?.discount ?? null,
          userErrors: payload?.userErrors ?? [],
        };
      } catch (caughtError) {
        const message =
          caughtError instanceof Error ? caughtError.message : "An unexpected error occurred";

        return {
          discount: null,
          userErrors: [{ message, code: "UNEXPECTED_ERROR" }],
        };
      }
    },
    [createDiscountMutation],
  );

  return {
    createDiscount,
    loading,
    error: error ?? null,
    reset,
  };
}

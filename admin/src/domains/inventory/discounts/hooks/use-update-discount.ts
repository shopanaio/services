"use client";

import { useCallback } from "react";
import { useMutation } from "@apollo/client/react";
import type { ApiDiscountUpdateInput } from "@/graphql/types";
import {
  DISCOUNT_UPDATE_MUTATION,
  type DiscountUpdateMutationData,
  type DiscountUpdateMutationVariables,
  type DiscountUpdateResult,
} from "../graphql";

interface UpdateDiscountInput {
  discountId: string;
  expectedRevision: number;
  operations: ApiDiscountUpdateInput;
}

export function useUpdateDiscount() {
  const [updateDiscountMutation, { loading, error, reset }] = useMutation<
    DiscountUpdateMutationData,
    DiscountUpdateMutationVariables
  >(DISCOUNT_UPDATE_MUTATION);

  const updateDiscount = useCallback(
    async (input: UpdateDiscountInput): Promise<DiscountUpdateResult> => {
      try {
        const result = await updateDiscountMutation({
          variables: input,
          fetchPolicy: "no-cache",
        });
        const payload = result.data?.pricingMutation.discountUpdate;
        const operationResults = payload?.operationResults ?? [];
        const userErrors = payload?.userErrors ?? [];
        const operationErrors = operationResults.flatMap((operation) => operation.errors);

        return {
          discount: payload?.discount ?? null,
          operationResults,
          userErrors,
          errors: [...userErrors, ...operationErrors],
        };
      } catch (caughtError) {
        const message =
          caughtError instanceof Error ? caughtError.message : "An unexpected error occurred";
        const userErrors = [{ message, code: "UNEXPECTED_ERROR" }];

        return {
          discount: null,
          operationResults: [],
          userErrors,
          errors: userErrors,
        };
      }
    },
    [updateDiscountMutation],
  );

  return {
    updateDiscount,
    loading,
    error: error ?? null,
    reset,
  };
}

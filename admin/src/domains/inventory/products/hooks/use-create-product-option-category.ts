"use client";

import { useMutation } from "@apollo/client/react";
import type { ApiProductOptionCategoryCreateInput } from "@/graphql/types";
import {
  PRODUCT_OPTION_CATEGORY_CREATE_MUTATION,
} from "../graphql/mutations";
import { PRODUCT_OPTION_CATEGORIES_QUERY } from "../graphql/queries";
import type {
  ProductOptionCategoryCreateMutationData,
  ProductOptionCategoryCreateMutationVariables,
} from "../graphql/operation-types";

export function useCreateProductOptionCategory() {
  const [mutate, { loading, error }] = useMutation<
    ProductOptionCategoryCreateMutationData,
    ProductOptionCategoryCreateMutationVariables
  >(PRODUCT_OPTION_CATEGORY_CREATE_MUTATION, {
    refetchQueries: [PRODUCT_OPTION_CATEGORIES_QUERY],
  });

  return {
    createCategory: async (input: ApiProductOptionCategoryCreateInput) => {
      const result = await mutate({ variables: { input } });
      const payload = result.data?.catalogMutation.productOptionCategoryCreate;
      return {
        category: payload?.category ?? null,
        userErrors: payload?.userErrors ?? [],
      };
    },
    loading,
    error: error ?? null,
  };
}

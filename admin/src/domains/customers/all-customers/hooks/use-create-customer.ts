"use client";

import { useCallback } from "react";
import { useMutation } from "@apollo/client/react";
import type { ApiCustomerCreateInput, ApiGenericUserError } from "@/graphql/types";
import { CUSTOMER_CREATE_MUTATION, CUSTOMERS_QUERY } from "../graphql";
import type {
  CustomerCreateMutationData,
  CustomerCreateMutationVariables,
} from "../graphql/operation-types";

export function useCreateCustomer() {
  const [mutate, { loading, error, reset }] = useMutation<
    CustomerCreateMutationData,
    CustomerCreateMutationVariables
  >(CUSTOMER_CREATE_MUTATION);

  const createCustomer = useCallback(async (input: ApiCustomerCreateInput) => {
    try {
      const result = await mutate({ variables: { input }, refetchQueries: [CUSTOMERS_QUERY] });
      const payload = result.data?.customersMutation.customerCreate;
      return {
        customer: payload?.customer ?? null,
        userErrors: payload?.userErrors ?? [],
      };
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Unable to create customer";
      return {
        customer: null,
        userErrors: [{ code: "UNEXPECTED_ERROR", message }] as ApiGenericUserError[],
      };
    }
  }, [mutate]);

  return { createCustomer, loading, error: error ?? null, reset };
}

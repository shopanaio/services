"use client";

import { useCallback } from "react";
import { useMutation } from "@apollo/client/react";
import type { ApiCustomerDeleteInput, ApiGenericUserError } from "@/graphql/types";
import { CUSTOMER_DELETE_MUTATION, CUSTOMERS_QUERY } from "../graphql";
import type {
  CustomerDeleteMutationData,
  CustomerDeleteMutationVariables,
} from "../graphql/operation-types";

export function useDeleteCustomer() {
  const [mutate, { loading, error, reset }] = useMutation<
    CustomerDeleteMutationData,
    CustomerDeleteMutationVariables
  >(CUSTOMER_DELETE_MUTATION);

  const deleteCustomer = useCallback(
    async (input: ApiCustomerDeleteInput) => {
      try {
        const result = await mutate({
          variables: { input },
          refetchQueries: [CUSTOMERS_QUERY],
        });
        const payload = result.data?.customersMutation.customerDelete;
        return {
          deletedCustomerId: payload?.deletedCustomerId ?? null,
          userErrors: payload?.userErrors ?? [],
        };
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : "Unable to delete customer";
        return {
          deletedCustomerId: null,
          userErrors: [{ code: "UNEXPECTED_ERROR", message }] as ApiGenericUserError[],
        };
      }
    },
    [mutate],
  );

  return { deleteCustomer, loading, error: error ?? null, reset };
}

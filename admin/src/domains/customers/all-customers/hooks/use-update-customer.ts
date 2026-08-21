"use client";

import { useCallback } from "react";
import { useMutation } from "@apollo/client/react";
import type { ApiCustomerUpdateInput, ApiGenericUserError } from "@/graphql/types";
import { CUSTOMER_UPDATE_MUTATION, CUSTOMERS_QUERY } from "../graphql";
import type {
  CustomerUpdateMutationData,
  CustomerUpdateMutationVariables,
} from "../graphql/operation-types";

export function useUpdateCustomer() {
  const [mutate, { loading, error, reset }] = useMutation<
    CustomerUpdateMutationData,
    CustomerUpdateMutationVariables
  >(CUSTOMER_UPDATE_MUTATION);

  const updateCustomer = useCallback(
    async (customerId: string, operations: ApiCustomerUpdateInput) => {
      try {
        const result = await mutate({
          variables: { customerId, operations },
          refetchQueries: [CUSTOMERS_QUERY],
        });
        const payload = result.data?.customersMutation.customerUpdate;
        const operationErrors = payload?.operationResults.flatMap((item) => item.errors) ?? [];
        return {
          customer: payload?.customer ?? null,
          userErrors: [...(payload?.userErrors ?? []), ...operationErrors],
        };
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : "Unable to update customer";
        return {
          customer: null,
          userErrors: [{ code: "UNEXPECTED_ERROR", message }] as ApiGenericUserError[],
        };
      }
    },
    [mutate],
  );

  return { updateCustomer, loading, error: error ?? null, reset };
}

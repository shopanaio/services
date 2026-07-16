"use client";

import { useCallback } from "react";
import { useMutation } from "@apollo/client/react";
import type { ApiCustomerSegmentCustomersSetInput, ApiGenericUserError } from "@/graphql/types";
import { CUSTOMER_SEGMENT_CUSTOMERS_SET_MUTATION, CUSTOMER_SEGMENTS_QUERY } from "../graphql";
import type { CustomerSegmentCustomersSetMutationData, CustomerSegmentCustomersSetMutationVariables } from "../graphql/operation-types";

export function useSetCustomerSegmentMembers() {
  const [mutate, { loading, error, reset }] = useMutation<CustomerSegmentCustomersSetMutationData, CustomerSegmentCustomersSetMutationVariables>(CUSTOMER_SEGMENT_CUSTOMERS_SET_MUTATION);
  const setSegmentMembers = useCallback(async (input: ApiCustomerSegmentCustomersSetInput) => {
    try {
      const result = await mutate({ variables: { input }, refetchQueries: [CUSTOMER_SEGMENTS_QUERY] });
      const payload = result.data?.customersMutation.customerSegmentCustomersSet;
      return { segment: payload?.segment ?? null, userErrors: payload?.userErrors ?? [] };
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Unable to update segment customers";
      return { segment: null, userErrors: [{ code: "UNEXPECTED_ERROR", message }] as ApiGenericUserError[] };
    }
  }, [mutate]);
  return { setSegmentMembers, loading, error: error ?? null, reset };
}

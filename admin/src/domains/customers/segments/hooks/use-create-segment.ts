"use client";

import { useCallback } from "react";
import { useMutation } from "@apollo/client/react";
import type { ApiCustomerSegmentCreateInput, ApiGenericUserError } from "@/graphql/types";
import { CUSTOMER_SEGMENT_CREATE_MUTATION, CUSTOMER_SEGMENTS_QUERY } from "../graphql";
import type {
  CustomerSegmentCreateMutationData,
  CustomerSegmentCreateMutationVariables,
} from "../graphql/operation-types";

export function useCreateCustomerSegment() {
  const [mutate, { loading, error, reset }] = useMutation<
    CustomerSegmentCreateMutationData,
    CustomerSegmentCreateMutationVariables
  >(CUSTOMER_SEGMENT_CREATE_MUTATION);
  const createSegment = useCallback(
    async (input: ApiCustomerSegmentCreateInput) => {
      try {
        const result = await mutate({
          variables: { input },
          refetchQueries: [CUSTOMER_SEGMENTS_QUERY],
        });
        const payload = result.data?.customersMutation.customerSegmentCreate;
        return { segment: payload?.segment ?? null, userErrors: payload?.userErrors ?? [] };
      } catch (cause) {
        const message =
          cause instanceof Error ? cause.message : "Unable to create customer segment";
        return {
          segment: null,
          userErrors: [{ code: "UNEXPECTED_ERROR", message }] as ApiGenericUserError[],
        };
      }
    },
    [mutate],
  );
  return { createSegment, loading, error: error ?? null, reset };
}

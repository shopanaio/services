"use client";

import { useCallback } from "react";
import { useMutation } from "@apollo/client/react";
import type { ApiCustomerSegmentUpdateInput, ApiGenericUserError } from "@/graphql/types";
import { CUSTOMER_SEGMENT_UPDATE_MUTATION, CUSTOMER_SEGMENTS_QUERY } from "../graphql";
import type { CustomerSegmentUpdateMutationData, CustomerSegmentUpdateMutationVariables } from "../graphql/operation-types";

export function useUpdateCustomerSegment() {
  const [mutate, { loading, error, reset }] = useMutation<CustomerSegmentUpdateMutationData, CustomerSegmentUpdateMutationVariables>(CUSTOMER_SEGMENT_UPDATE_MUTATION);
  const updateSegment = useCallback(async (segmentId: string, expectedRevision: number, operations: ApiCustomerSegmentUpdateInput) => {
    try {
      const result = await mutate({ variables: { segmentId, expectedRevision, operations }, refetchQueries: [CUSTOMER_SEGMENTS_QUERY] });
      const payload = result.data?.customersMutation.customerSegmentUpdate;
      const operationErrors = payload?.operationResults.flatMap((item) => item.errors) ?? [];
      return { segment: payload?.segment ?? null, userErrors: [...(payload?.userErrors ?? []), ...operationErrors] };
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Unable to update customer segment";
      return { segment: null, userErrors: [{ code: "UNEXPECTED_ERROR", message }] as ApiGenericUserError[] };
    }
  }, [mutate]);
  return { updateSegment, loading, error: error ?? null, reset };
}

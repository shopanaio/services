"use client";

import { useCallback } from "react";
import { useMutation } from "@apollo/client/react";
import type { ApiCustomerSegmentDeleteInput, ApiGenericUserError } from "@/graphql/types";
import { CUSTOMER_SEGMENT_DELETE_MUTATION, CUSTOMER_SEGMENTS_QUERY } from "../graphql";
import type {
  CustomerSegmentDeleteMutationData,
  CustomerSegmentDeleteMutationVariables,
} from "../graphql/operation-types";

export function useDeleteCustomerSegment() {
  const [mutate, { loading, error, reset }] = useMutation<
    CustomerSegmentDeleteMutationData,
    CustomerSegmentDeleteMutationVariables
  >(CUSTOMER_SEGMENT_DELETE_MUTATION);
  const deleteSegment = useCallback(
    async (input: ApiCustomerSegmentDeleteInput) => {
      try {
        const result = await mutate({
          variables: { input },
          refetchQueries: [CUSTOMER_SEGMENTS_QUERY],
        });
        const payload = result.data?.customersMutation.customerSegmentDelete;
        return {
          deletedSegmentId: payload?.deletedSegmentId ?? null,
          userErrors: payload?.userErrors ?? [],
        };
      } catch (cause) {
        const message =
          cause instanceof Error ? cause.message : "Unable to delete customer segment";
        return {
          deletedSegmentId: null,
          userErrors: [{ code: "UNEXPECTED_ERROR", message }] as ApiGenericUserError[],
        };
      }
    },
    [mutate],
  );
  return { deleteSegment, loading, error: error ?? null, reset };
}

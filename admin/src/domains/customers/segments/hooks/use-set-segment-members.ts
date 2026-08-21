"use client";

import { useCallback } from "react";
import { useMutation } from "@apollo/client/react";
import type { ApiGenericUserError } from "@/graphql/types";
import { CUSTOMER_SEGMENT_UPDATE_MUTATION, CUSTOMER_SEGMENTS_QUERY } from "../graphql";
import type {
  CustomerSegmentUpdateMutationData,
  CustomerSegmentUpdateMutationVariables,
} from "../graphql/operation-types";

interface SetCustomerSegmentMembersInput {
  segmentId: string;

  customerIds: string[];
}

export function useSetCustomerSegmentMembers() {
  const [mutate, { loading, error, reset }] = useMutation<
    CustomerSegmentUpdateMutationData,
    CustomerSegmentUpdateMutationVariables
  >(CUSTOMER_SEGMENT_UPDATE_MUTATION);
  const setSegmentMembers = useCallback(
    async (input: SetCustomerSegmentMembersInput) => {
      try {
        const result = await mutate({
          variables: {
            segmentId: input.segmentId,

            operations: {
              memberships: {
                setCustomerIds: input.customerIds,
              },
            },
          },
          refetchQueries: [CUSTOMER_SEGMENTS_QUERY],
        });
        const payload = result.data?.customersMutation.customerSegmentUpdate;
        const operationErrors = payload?.operationResults.flatMap((item) => item.errors) ?? [];
        return {
          segment: payload?.segment ?? null,
          userErrors: [...(payload?.userErrors ?? []), ...operationErrors],
        };
      } catch (cause) {
        const message =
          cause instanceof Error ? cause.message : "Unable to update segment customers";
        return {
          segment: null,
          userErrors: [{ code: "UNEXPECTED_ERROR", message }] as ApiGenericUserError[],
        };
      }
    },
    [mutate],
  );
  return { setSegmentMembers, loading, error: error ?? null, reset };
}

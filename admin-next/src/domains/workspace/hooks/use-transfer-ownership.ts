"use client";

import { useMutation } from "@apollo/client/react";
import { useCallback } from "react";
import { TRANSFER_OWNERSHIP_MUTATION, ORGANIZATION_QUERY } from "../graphql";
import type {
  ApiOwnershipTransferInput,
  ApiOwnershipTransferPayload,
  ApiGenericUserError,
} from "@/graphql/types";

interface TransferOwnershipResult {
  success: boolean;
  userErrors: ApiGenericUserError[];
}

interface UseTransferOwnershipReturn {
  transferOwnership: (organizationId: string, newOwnerId: string) => Promise<TransferOwnershipResult>;
  loading: boolean;
  error: Error | null;
}

/**
 * Hook for transferring organization ownership to another admin.
 * Only the current owner can transfer ownership.
 * The new owner must already have admin role in the organization.
 */
export function useTransferOwnership(): UseTransferOwnershipReturn {
  const [mutate, { loading, error }] = useMutation<
    { organizationMutation: { ownershipTransfer: ApiOwnershipTransferPayload } },
    { input: ApiOwnershipTransferInput }
  >(TRANSFER_OWNERSHIP_MUTATION);

  const transferOwnership = useCallback(
    async (organizationId: string, newOwnerId: string): Promise<TransferOwnershipResult> => {
      const result = await mutate({
        variables: { input: { organizationId, newOwnerId } },
        refetchQueries: [{ query: ORGANIZATION_QUERY, variables: { id: organizationId } }],
      });
      const payload = result.data?.organizationMutation.ownershipTransfer;

      return {
        success: payload?.success ?? false,
        userErrors: payload?.userErrors ?? [],
      };
    },
    [mutate]
  );

  return {
    transferOwnership,
    loading,
    error: error ?? null,
  };
}

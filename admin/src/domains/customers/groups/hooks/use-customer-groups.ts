"use client";

import { useMutation, useQuery } from "@apollo/client/react";
import type {
  ApiCustomerGroup,
  ApiCustomerGroupConnection,
  ApiCustomerGroupCreateInput,
  ApiCustomerGroupCreatePayload,
  ApiCustomerGroupDeleteInput,
  ApiCustomerGroupDeletePayload,
  ApiCustomerGroupOrderByInput,
  ApiCustomerGroupUpdateInput,
  ApiCustomerGroupUpdatePayload,
  ApiCustomerGroupWhereInput,
  ApiCustomersMutation,
  ApiCustomersQuery,
  ApiGenericUserError,
} from "@/graphql/types";
import {
  CUSTOMER_GROUP_CREATE_MUTATION,
  CUSTOMER_GROUP_DELETE_MUTATION,
  CUSTOMER_GROUP_QUERY,
  CUSTOMER_GROUP_UPDATE_MUTATION,
  CUSTOMER_GROUPS_QUERY,
} from "../graphql/operations";

export interface CustomerGroupsVariables {
  first?: number;
  after?: string | null;
  where?: ApiCustomerGroupWhereInput | null;
  orderBy?: ApiCustomerGroupOrderByInput[] | null;
}

export function useCustomerGroups(variables: CustomerGroupsVariables) {
  const query = useQuery<
    {
      customersQuery: Pick<ApiCustomersQuery, "customerGroups"> & {
        customerGroups: ApiCustomerGroupConnection;
      };
    },
    CustomerGroupsVariables
  >(CUSTOMER_GROUPS_QUERY, { variables, fetchPolicy: "cache-and-network" });
  const connection = (query.data ?? query.previousData)?.customersQuery.customerGroups ?? null;
  return {
    groups: connection?.edges.map((edge) => edge.node) ?? [],
    connection,
    totalCount: connection?.totalCount ?? 0,
    pageInfo: connection?.pageInfo ?? null,
    loading: query.loading,
    error: query.error ?? null,
    refetch: query.refetch,
  };
}

export function useCustomerGroup(id?: string) {
  const query = useQuery<
    {
      customersQuery: Pick<ApiCustomersQuery, "customerGroup"> & {
        customerGroup: ApiCustomerGroup | null;
      };
    },
    { id: string }
  >(CUSTOMER_GROUP_QUERY, {
    variables: { id: id ?? "" },
    skip: !id,
    fetchPolicy: "cache-and-network",
  });
  return {
    group: (query.data ?? query.previousData)?.customersQuery.customerGroup ?? null,
    loading: query.loading,
    error: query.error ?? null,
    refetch: query.refetch,
  };
}

const unexpected = (cause: unknown) =>
  [
    {
      code: "UNEXPECTED_ERROR",
      message: cause instanceof Error ? cause.message : "Unexpected error",
    },
  ] as ApiGenericUserError[];

export function useCustomerGroupMutations() {
  const [createMutation, createState] = useMutation<
    {
      customersMutation: Pick<ApiCustomersMutation, "customerGroupCreate"> & {
        customerGroupCreate: ApiCustomerGroupCreatePayload;
      };
    },
    { input: ApiCustomerGroupCreateInput }
  >(CUSTOMER_GROUP_CREATE_MUTATION);
  const [updateMutation, updateState] = useMutation<
    {
      customersMutation: Pick<ApiCustomersMutation, "customerGroupUpdate"> & {
        customerGroupUpdate: ApiCustomerGroupUpdatePayload;
      };
    },
    { groupId: string; operations: ApiCustomerGroupUpdateInput }
  >(CUSTOMER_GROUP_UPDATE_MUTATION);
  const [deleteMutation, deleteState] = useMutation<
    {
      customersMutation: Pick<ApiCustomersMutation, "customerGroupDelete"> & {
        customerGroupDelete: ApiCustomerGroupDeletePayload;
      };
    },
    { input: ApiCustomerGroupDeleteInput }
  >(CUSTOMER_GROUP_DELETE_MUTATION);
  return {
    createGroup: async (input: ApiCustomerGroupCreateInput) => {
      try {
        const result = await createMutation({
          variables: { input },
          refetchQueries: [CUSTOMER_GROUPS_QUERY],
        });
        return (
          result.data?.customersMutation.customerGroupCreate ?? { group: null, userErrors: [] }
        );
      } catch (cause) {
        return { group: null, userErrors: unexpected(cause) };
      }
    },
    updateGroup: async (
      groupId: string,

      operations: ApiCustomerGroupUpdateInput,
    ) => {
      try {
        const result = await updateMutation({
          variables: { groupId, operations },
          refetchQueries: [CUSTOMER_GROUPS_QUERY],
        });
        const payload = result.data?.customersMutation.customerGroupUpdate;
        return {
          group: payload?.group ?? null,
          userErrors: [
            ...(payload?.userErrors ?? []),
            ...(payload?.operationResults.flatMap((item) => item.errors) ?? []),
          ],
        };
      } catch (cause) {
        return { group: null, userErrors: unexpected(cause) };
      }
    },
    deleteGroup: async (input: ApiCustomerGroupDeleteInput) => {
      try {
        const result = await deleteMutation({
          variables: { input },
          refetchQueries: [CUSTOMER_GROUPS_QUERY],
        });
        return (
          result.data?.customersMutation.customerGroupDelete ?? {
            deletedGroupId: null,
            userErrors: [],
          }
        );
      } catch (cause) {
        return { deletedGroupId: null, userErrors: unexpected(cause) };
      }
    },
    loading: createState.loading || updateState.loading || deleteState.loading,
    error: createState.error ?? updateState.error ?? deleteState.error ?? null,
  };
}

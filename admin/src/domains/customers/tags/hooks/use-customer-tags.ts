"use client";
import { useMutation, useQuery } from "@apollo/client/react";
import type {
  ApiCustomerTag,
  ApiCustomerTagConnection,
  ApiCustomerTagCreateInput,
  ApiCustomerTagCreatePayload,
  ApiCustomerTagDeleteInput,
  ApiCustomerTagDeletePayload,
  ApiCustomerTagOrderByInput,
  ApiCustomerTagUpdateInput,
  ApiCustomerTagUpdatePayload,
  ApiCustomerTagWhereInput,
  ApiCustomersMutation,
  ApiCustomersQuery,
  ApiGenericUserError,
} from "@/graphql/types";
import {
  CUSTOMER_TAG_CREATE_MUTATION,
  CUSTOMER_TAG_DELETE_MUTATION,
  CUSTOMER_TAG_QUERY,
  CUSTOMER_TAG_UPDATE_MUTATION,
  CUSTOMER_TAGS_QUERY,
} from "../graphql/operations";

export interface CustomerTagsVariables {
  first?: number;
  after?: string | null;
  where?: ApiCustomerTagWhereInput | null;
  orderBy?: ApiCustomerTagOrderByInput[] | null;
}
export function useCustomerTags(variables: CustomerTagsVariables) {
  const query = useQuery<
    {
      customersQuery: Pick<ApiCustomersQuery, "customerTags"> & {
        customerTags: ApiCustomerTagConnection;
      };
    },
    CustomerTagsVariables
  >(CUSTOMER_TAGS_QUERY, { variables, fetchPolicy: "cache-and-network" });
  const connection = (query.data ?? query.previousData)?.customersQuery.customerTags ?? null;
  return {
    tags: connection?.edges.map((edge) => edge.node) ?? [],
    totalCount: connection?.totalCount ?? 0,
    pageInfo: connection?.pageInfo ?? null,
    loading: query.loading,
    error: query.error ?? null,
    refetch: query.refetch,
  };
}
export function useCustomerTag(id?: string) {
  const query = useQuery<
    {
      customersQuery: Pick<ApiCustomersQuery, "customerTag"> & {
        customerTag: ApiCustomerTag | null;
      };
    },
    { id: string }
  >(CUSTOMER_TAG_QUERY, {
    variables: { id: id ?? "" },
    skip: !id,
    fetchPolicy: "cache-and-network",
  });
  return {
    tag: (query.data ?? query.previousData)?.customersQuery.customerTag ?? null,
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
export function useCustomerTagMutations() {
  const [createMutation, createState] = useMutation<
    {
      customersMutation: Pick<ApiCustomersMutation, "customerTagCreate"> & {
        customerTagCreate: ApiCustomerTagCreatePayload;
      };
    },
    { input: ApiCustomerTagCreateInput }
  >(CUSTOMER_TAG_CREATE_MUTATION);
  const [updateMutation, updateState] = useMutation<
    {
      customersMutation: Pick<ApiCustomersMutation, "customerTagUpdate"> & {
        customerTagUpdate: ApiCustomerTagUpdatePayload;
      };
    },
    { tagId: string; operations: ApiCustomerTagUpdateInput }
  >(CUSTOMER_TAG_UPDATE_MUTATION);
  const [deleteMutation, deleteState] = useMutation<
    {
      customersMutation: Pick<ApiCustomersMutation, "customerTagDelete"> & {
        customerTagDelete: ApiCustomerTagDeletePayload;
      };
    },
    { input: ApiCustomerTagDeleteInput }
  >(CUSTOMER_TAG_DELETE_MUTATION);
  return {
    createTag: async (input: ApiCustomerTagCreateInput) => {
      try {
        const result = await createMutation({
          variables: { input },
          refetchQueries: [CUSTOMER_TAGS_QUERY],
        });
        return result.data?.customersMutation.customerTagCreate ?? { tag: null, userErrors: [] };
      } catch (cause) {
        return { tag: null, userErrors: unexpected(cause) };
      }
    },
    updateTag: async (tagId: string, operations: ApiCustomerTagUpdateInput) => {
      try {
        const result = await updateMutation({
          variables: { tagId, operations },
          refetchQueries: [CUSTOMER_TAGS_QUERY],
        });
        const payload = result.data?.customersMutation.customerTagUpdate;
        return {
          tag: payload?.tag ?? null,
          userErrors: [
            ...(payload?.userErrors ?? []),
            ...(payload?.operationResults.flatMap((item) => item.errors) ?? []),
          ],
        };
      } catch (cause) {
        return { tag: null, userErrors: unexpected(cause) };
      }
    },
    deleteTag: async (input: ApiCustomerTagDeleteInput) => {
      try {
        const result = await deleteMutation({
          variables: { input },
          refetchQueries: [CUSTOMER_TAGS_QUERY],
        });
        return (
          result.data?.customersMutation.customerTagDelete ?? { deletedTagId: null, userErrors: [] }
        );
      } catch (cause) {
        return { deletedTagId: null, userErrors: unexpected(cause) };
      }
    },
    loading: createState.loading || updateState.loading || deleteState.loading,
    error: createState.error ?? updateState.error ?? deleteState.error ?? null,
  };
}

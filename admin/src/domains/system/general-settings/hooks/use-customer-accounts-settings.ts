"use client";

import { useMutation, useQuery } from "@apollo/client/react";
import type {
  ApiCustomerAccountsSettingsUpdateInput,
  ApiCustomersMutation,
  ApiCustomersQuery,
} from "@/graphql/types";
import {
  CUSTOMER_ACCOUNTS_SETTINGS_QUERY,
  UPDATE_CUSTOMER_ACCOUNTS_SETTINGS_MUTATION,
} from "../graphql";

export const useCustomerAccountsSettings = () => {
  const query = useQuery<{
    customersQuery: Pick<ApiCustomersQuery, "customerAccountsSettings">;
  }>(CUSTOMER_ACCOUNTS_SETTINGS_QUERY, {
    fetchPolicy: "cache-and-network",
  });
  const [mutate, mutation] = useMutation<
    {
      customersMutation: Pick<ApiCustomersMutation, "customerAccountsSettingsUpdate">;
    },
    { input: ApiCustomerAccountsSettingsUpdateInput }
  >(UPDATE_CUSTOMER_ACCOUNTS_SETTINGS_MUTATION);

  const updateSettings = async (input: ApiCustomerAccountsSettingsUpdateInput) => {
    const result = await mutate({
      variables: { input },
      refetchQueries: [CUSTOMER_ACCOUNTS_SETTINGS_QUERY],
    });
    const payload = result.data?.customersMutation.customerAccountsSettingsUpdate;
    return {
      settings: payload?.settings ?? null,
      userErrors: payload?.userErrors ?? [],
    };
  };

  return {
    settings: query.data?.customersQuery.customerAccountsSettings ?? null,
    loading: query.loading,
    error: query.error ?? mutation.error ?? null,
    updateSettings,
    updating: mutation.loading,
    refetch: query.refetch,
  };
};

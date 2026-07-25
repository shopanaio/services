"use client";

import { useMutation } from "@apollo/client/react";
import type {
  ApiSalesChannelConnectionActionInput,
  ApiSalesChannelConnectionCreateInput,
} from "@/graphql/types";
import {
  SALES_CHANNEL_CONNECTION_CREATE_MUTATION,
  SALES_CHANNEL_CONNECTION_DISCONNECT_MUTATION,
  SALES_CHANNEL_CONNECTION_RESUME_MUTATION,
  SALES_CHANNEL_CONNECTION_SUSPEND_MUTATION,
  type SalesChannelCreateData,
  type SalesChannelCreateVariables,
} from "../graphql";

export function useSalesChannelMutations() {
  const [createMutation, createState] = useMutation<
    SalesChannelCreateData,
    SalesChannelCreateVariables
  >(SALES_CHANNEL_CONNECTION_CREATE_MUTATION, {
    refetchQueries: ["SalesChannelConnections"],
  });
  const [suspendMutation, suspendState] = useMutation(
    SALES_CHANNEL_CONNECTION_SUSPEND_MUTATION,
    { refetchQueries: ["SalesChannelConnections"] },
  );
  const [resumeMutation, resumeState] = useMutation(
    SALES_CHANNEL_CONNECTION_RESUME_MUTATION,
    { refetchQueries: ["SalesChannelConnections"] },
  );
  const [disconnectMutation, disconnectState] = useMutation(
    SALES_CHANNEL_CONNECTION_DISCONNECT_MUTATION,
    { refetchQueries: ["SalesChannelConnections"] },
  );

  return {
    create: (input: ApiSalesChannelConnectionCreateInput) =>
      createMutation({ variables: { input } }),
    action: (
      action: "suspend" | "resume" | "disconnect",
      input: ApiSalesChannelConnectionActionInput,
    ) =>
      ({
        suspend: suspendMutation,
        resume: resumeMutation,
        disconnect: disconnectMutation,
      })[action]({ variables: { input } }),
    loading:
      createState.loading ||
      suspendState.loading ||
      resumeState.loading ||
      disconnectState.loading,
    error:
      createState.error ??
      suspendState.error ??
      resumeState.error ??
      disconnectState.error ??
      null,
  };
}

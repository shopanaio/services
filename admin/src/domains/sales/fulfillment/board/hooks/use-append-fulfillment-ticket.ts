"use client";
import { requestAppendFulfillmentTicket } from "../api";
import { useRequestMutation } from "./use-request-mutation";
export function useAppendFulfillmentTicket() {
  const value = useRequestMutation(requestAppendFulfillmentTicket);
  return {
    appendTicket: value.mutate,
    loading: value.loading,
    error: value.error,
    reset: value.reset,
  };
}

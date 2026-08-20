"use client";
import { requestUpdateFulfillmentStage } from "../api";
import { useRequestMutation } from "./use-request-mutation";
export function useUpdateFulfillmentStage() {
  const value = useRequestMutation(requestUpdateFulfillmentStage);
  return {
    updateStage: value.mutate,
    loading: value.loading,
    error: value.error,
    reset: value.reset,
  };
}

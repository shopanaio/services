"use client";
import { requestReorderFulfillmentStages } from "../api";
import { useRequestMutation } from "./use-request-mutation";
export function useReorderFulfillmentStages() {
  const value = useRequestMutation(requestReorderFulfillmentStages);
  return {
    reorderStages: value.mutate,
    loading: value.loading,
    error: value.error,
    reset: value.reset,
  };
}

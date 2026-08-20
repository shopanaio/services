"use client";
import { requestCreateFulfillmentStage } from "../api";
import { useRequestMutation } from "./use-request-mutation";
export function useCreateFulfillmentStage() {
  const value = useRequestMutation(requestCreateFulfillmentStage);
  return {
    createStage: value.mutate,
    loading: value.loading,
    error: value.error,
    reset: value.reset,
  };
}

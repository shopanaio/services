"use client";
import { requestDeleteFulfillmentStage } from "../api";
import { useRequestMutation } from "./use-request-mutation";
export function useDeleteFulfillmentStage() { const value = useRequestMutation(requestDeleteFulfillmentStage); return { deleteStage: value.mutate, loading: value.loading, error: value.error, reset: value.reset }; }

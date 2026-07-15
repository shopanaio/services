"use client";
import { requestMoveFulfillmentTicket } from "../api";
import { useRequestMutation } from "./use-request-mutation";
export function useMoveFulfillmentTicket() { const value = useRequestMutation(requestMoveFulfillmentTicket); return { moveTicket: value.mutate, loading: value.loading, error: value.error, reset: value.reset }; }

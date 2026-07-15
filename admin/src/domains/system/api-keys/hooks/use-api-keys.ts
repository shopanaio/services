"use client";

import type { ApiApiKey } from "@/graphql/types";
import { useCallback, useSyncExternalStore } from "react";
import {
  getApiKeysSnapshot,
  subscribeToApiKeys,
} from "../mock/api-keys-store";

export const useApiKeys = () => {
  const apiKeys = useSyncExternalStore(
    subscribeToApiKeys,
    getApiKeysSnapshot,
    getApiKeysSnapshot,
  );
  const refetch = useCallback(async (): Promise<ApiApiKey[]> => apiKeys, [apiKeys]);

  return {
    apiKeys,
    loading: false,
    error: null as Error | null,
    refetch,
  };
};

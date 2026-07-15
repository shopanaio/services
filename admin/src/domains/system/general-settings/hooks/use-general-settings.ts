"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  getGeneralSettingsSnapshot,
  subscribeToGeneralSettings,
} from "../mock/general-settings-store";

export const useGeneralSettings = () => {
  const snapshot = useSyncExternalStore(
    subscribeToGeneralSettings,
    getGeneralSettingsSnapshot,
    getGeneralSettingsSnapshot,
  );

  const refetch = useCallback(async () => getGeneralSettingsSnapshot(), []);

  return {
    store: snapshot.store,
    locales: snapshot.locales,
    loading: false,
    error: null as Error | null,
    refetch,
  };
};

"use client";

import { useCallback, useSyncExternalStore } from "react";
import { getAppsSnapshot, subscribeToApps } from "../mock/apps-store";

export const useApps = () => {
  const snapshot = useSyncExternalStore(
    subscribeToApps,
    getAppsSnapshot,
    getAppsSnapshot,
  );
  const refetch = useCallback(async () => getAppsSnapshot(), []);

  return {
    apps: snapshot.apps,
    installedApps: snapshot.installedApps,
    loading: false,
    error: null as Error | null,
    refetch,
  };
};

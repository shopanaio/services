"use client";

import { useEffect } from "react";
import { useQuery } from "@apollo/client/react";
import { AppInstallationStatus } from "@/graphql/types";
import { APPS_MANAGEMENT_QUERY } from "../graphql";
import type { AppsManagementQueryData } from "../graphql/operation-types";

const POLLING_STATUSES = new Set<AppInstallationStatus>([
  AppInstallationStatus.Installing,
  AppInstallationStatus.PendingConsent,
  AppInstallationStatus.Resuming,
  AppInstallationStatus.Suspending,
  AppInstallationStatus.Uninstalling,
  AppInstallationStatus.Updating,
]);

export const useAppsManagement = () => {
  const {
    data,
    loading,
    error,
    refetch,
    startPolling,
    stopPolling,
  } = useQuery<AppsManagementQueryData>(APPS_MANAGEMENT_QUERY, {
    fetchPolicy: "cache-and-network",
  });
  const apps = data?.appsQuery.availableApps ?? [];
  const installedApps = apps.filter(({ installed }) => installed);
  const availableApps = apps.filter(({ installed }) => !installed);
  const hasPendingOperation = installedApps.some(({ installation }) =>
    installation ? POLLING_STATUSES.has(installation.status) : false,
  );

  useEffect(() => {
    if (hasPendingOperation) {
      startPolling(2_000);
    } else {
      stopPolling();
    }

    return stopPolling;
  }, [hasPendingOperation, startPolling, stopPolling]);

  return {
    installedApps,
    availableApps,
    loading,
    error: error ?? null,
    refetch: async () => {
      await refetch();
    },
  };
};

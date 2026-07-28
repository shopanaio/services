"use client";

import { useEffect, useMemo } from "react";
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
  const apps = useMemo(
    () => {
      const sourceApps = data?.appsQuery.availableApps ?? [];

      return [...sourceApps].sort((left, right) => {
        const leftRank =
          left.installation?.status === AppInstallationStatus.Active
            ? 0
            : left.installed
              ? 1
              : 2;
        const rightRank =
          right.installation?.status === AppInstallationStatus.Active
            ? 0
            : right.installed
              ? 1
              : 2;

        return (
          leftRank - rightRank ||
          left.displayName.localeCompare(right.displayName)
        );
      });
    },
    [data?.appsQuery.availableApps],
  );
  const hasPendingOperation = apps.some(({ installation }) =>
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
    apps,
    loading,
    error: error ?? null,
    refetch: async () => {
      await refetch();
    },
  };
};

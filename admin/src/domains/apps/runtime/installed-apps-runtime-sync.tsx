"use client";

import { useQuery } from "@apollo/client/react";
import { useEffect, useMemo } from "react";
import { AppInstallationStatus } from "@/graphql/types";
import {
  ADMIN_UI_APPS_QUERY,
  APPS_MANAGEMENT_QUERY,
} from "../management/graphql";
import type {
  AdminUiAppsQueryData,
  AppsManagementQueryData,
} from "../management/graphql/operation-types";
import {
  parseAdminAppUiDescriptors,
  type AdminAppUiDescriptor,
} from "./descriptor-schema";
import { getLocalAdminApp } from "./local-app-registry";

interface Props {
  fallbackDescriptors: readonly AdminAppUiDescriptor[];
  onDescriptors: (descriptors: AdminAppUiDescriptor[]) => void;
}

export function InstalledAppsRuntimeSync({
  fallbackDescriptors,
  onDescriptors,
}: Props) {
  const discoveryEnabled =
    process.env.NEXT_PUBLIC_ADMIN_APPS_DISCOVERY === "true";
  const { data: discoveredData } = useQuery<AdminUiAppsQueryData>(
    ADMIN_UI_APPS_QUERY,
    {
      skip: !discoveryEnabled,
      fetchPolicy: "cache-and-network",
    },
  );
  const { data: managementData } = useQuery<AppsManagementQueryData>(
    APPS_MANAGEMENT_QUERY,
    {
      skip: discoveryEnabled,
      fetchPolicy: "cache-and-network",
    },
  );
  const localDescriptors = useMemo<AdminAppUiDescriptor[]>(() => {
    if (discoveryEnabled) return [];

    return (managementData?.appsQuery.availableApps ?? []).flatMap((app) => {
      const registration = getLocalAdminApp(app.code);
      const installation = app.installation;
      if (
        !registration ||
        !installation ||
        installation.status !== AppInstallationStatus.Active
      ) {
        return [];
      }

      return [
        {
          installationId: installation.id,
          appCode: app.code,
          displayName: app.displayName,
          version: installation.installedVersion,
          sdkVersionRange: "^1.0.0",
          remote: {
            name: registration.remoteName,
            manifestUrl: `local:${app.code}`,
            contentHash: "local",
          },
          page: {
            module: registration.pageModule,
            defaultPath: registration.defaultPath,
          },
          navigation: [],
          modals: [],
          extensions: [],
          grantedScopes: app.permissions
            .filter(({ granted }) => granted)
            .map(({ scope }) => scope),
        },
      ];
    });
  }, [
    discoveryEnabled,
    managementData?.appsQuery.availableApps,
  ]);

  const source = discoveryEnabled
    ? discoveredData?.appsQuery.adminUiApps
    : localDescriptors;

  useEffect(() => {
    const descriptors = source ?? fallbackDescriptors;
    try {
      onDescriptors(parseAdminAppUiDescriptors(descriptors));
    } catch (error) {
      console.error("[AdminApps] Invalid UI descriptor response", error);
      onDescriptors([...fallbackDescriptors]);
    }
  }, [fallbackDescriptors, onDescriptors, source]);

  return null;
}

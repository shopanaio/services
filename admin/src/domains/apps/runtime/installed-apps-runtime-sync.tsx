"use client";

import { useQuery } from "@apollo/client/react";
import { useEffect } from "react";
import { ADMIN_UI_APPS_QUERY } from "../management/graphql";
import type { AdminUiAppsQueryData } from "../management/graphql/operation-types";
import {
  parseAdminAppUiDescriptors,
  type AdminAppUiDescriptor,
} from "./descriptor-schema";

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
  const { data } = useQuery<AdminUiAppsQueryData>(ADMIN_UI_APPS_QUERY, {
    skip: !discoveryEnabled,
    fetchPolicy: "cache-and-network",
  });

  useEffect(() => {
    const source = data?.appsQuery.adminUiApps ?? fallbackDescriptors;
    try {
      onDescriptors(parseAdminAppUiDescriptors(source));
    } catch (error) {
      console.error("[AdminApps] Invalid UI descriptor response", error);
      onDescriptors([...fallbackDescriptors]);
    }
  }, [data, fallbackDescriptors, onDescriptors]);

  return null;
}


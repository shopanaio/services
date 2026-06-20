"use client";

import type { ReactNode } from "react";
import { usePathParams } from "@/registry";
import { useCurrentStore } from "../hooks/use-current-store";
import { useOrganization } from "../hooks/use-organization";

interface WorkspaceDataLoaderProps {
  children: ReactNode;
  organizationName?: string;
}

export function WorkspaceDataLoader({
  children,
  organizationName,
}: WorkspaceDataLoaderProps) {
  const pathContext = usePathParams();
  const storeName = pathContext.getParam("storeName");

  const { organization } = useOrganization(organizationName ?? "", {
    skip: !organizationName,
  });

  useCurrentStore({
    skip: !organization?.id || !storeName,
  });

  return children;
}

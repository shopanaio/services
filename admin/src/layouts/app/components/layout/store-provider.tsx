"use client";

import type { ReactNode } from "react";
import { useOrganization, useCurrentStore } from "@/domains/workspace";
import { usePathParams } from "@/registry";

interface StoreProviderProps {
  children: ReactNode;
}

export function StoreProvider({ children }: StoreProviderProps) {
  const pathContext = usePathParams();
  const orgName = pathContext.getParam("orgName");
  const storeName = pathContext.getParam("storeName");

  const { organization } = useOrganization(orgName ?? "", {
    skip: !orgName,
  });

  useCurrentStore({
    skip: !organization?.id || !storeName,
  });

  return children;
}

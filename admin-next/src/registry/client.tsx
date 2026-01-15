"use client";

import { createContext, useContext, useEffect, useRef, Fragment, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { moduleRegistry, type SidebarItem, type DomainLayoutComponent } from "./registry";
import type { IModalStackDefinition } from "@/layouts/modals/types";
import { registerModalStackItem } from "@/layouts/modals/registry/modal-registry";
import { PathParamsProvider } from "./path-params-context";
import { modulesContext } from "./modules-context";
import type { ParamData } from "path-to-regexp";

// Initialize modules on client side (module-level, runs once)
modulesContext.keys().forEach((key) => modulesContext(key));

// ============================================================================
// Sidebar Items Context
// ============================================================================

const SidebarItemsContext = createContext<SidebarItem[]>([]);

export function useSidebarItems(): SidebarItem[] {
  return useContext(SidebarItemsContext);
}

// ============================================================================
// Modal Stack Registration
// ============================================================================

interface ModalStackRegistrationProps {
  getModalStackItems?: () => IModalStackDefinition[];
}

function ModalStackRegistration({ getModalStackItems }: ModalStackRegistrationProps) {
  const registeredRef = useRef(false);

  useEffect(() => {
    if (registeredRef.current || !getModalStackItems) return;
    registeredRef.current = true;

    const items = getModalStackItems();
    items.forEach((item) => {
      registerModalStackItem(item);
    });
  }, [getModalStackItems]);

  return null;
}

// ============================================================================
// Combined Provider
// ============================================================================

interface ModuleProviderProps {
  children: ReactNode;
  sidebarItems: SidebarItem[];
  getModalStackItems?: () => IModalStackDefinition[];
}

/**
 * Combined provider for module registry client-side state
 * Handles sidebar items context and modal stack registration
 */
export function ModuleProvider({
  children,
  sidebarItems,
  getModalStackItems,
}: ModuleProviderProps) {
  return (
    <SidebarItemsContext.Provider value={sidebarItems}>
      <ModalStackRegistration getModalStackItems={getModalStackItems} />
      {children}
    </SidebarItemsContext.Provider>
  );
}

// ============================================================================
// Client-side Layout Resolution
// ============================================================================

/**
 * Resolves the domain layout component based on the pathname (client-side).
 */
function resolveDomainLayout(pathname: string): {
  Layout: DomainLayoutComponent | typeof Fragment;
  pathParams: ParamData;
} {
  const matchResult = moduleRegistry.matchPath(pathname);

  if (!matchResult) {
    return { Layout: Fragment, pathParams: {} };
  }

  const Layout = matchResult.domainConfig?.layout ?? Fragment;
  const pathParams = matchResult.params ? { ...matchResult.params } : {};

  return { Layout, pathParams };
}

interface ClientLayoutResolverProps {
  children: ReactNode;
  sidebarItems: SidebarItem[];
  getModalStackItems?: () => IModalStackDefinition[];
}

/**
 * Client component that resolves and renders the appropriate domain layout
 * based on the current pathname.
 */
export function ClientLayoutResolver({
  children,
  sidebarItems,
  getModalStackItems,
}: ClientLayoutResolverProps) {
  const pathname = usePathname();
  const { Layout: DomainLayout, pathParams } = resolveDomainLayout(pathname);

  return (
    <ModuleProvider sidebarItems={sidebarItems} getModalStackItems={getModalStackItems}>
      <PathParamsProvider pathParams={pathParams}>
        <DomainLayout>{children}</DomainLayout>
      </PathParamsProvider>
    </ModuleProvider>
  );
}

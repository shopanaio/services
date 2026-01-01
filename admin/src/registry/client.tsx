"use client";

import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import type { SidebarItem } from "./registry";
import type { IDrawerDefinition } from "@/layouts/drawers/types";
import { registerDrawer } from "@/layouts/drawers/registry/drawerRegistry";

// ============================================================================
// Sidebar Items Context
// ============================================================================

const SidebarItemsContext = createContext<SidebarItem[]>([]);

export function useSidebarItems(): SidebarItem[] {
  return useContext(SidebarItemsContext);
}

// ============================================================================
// Drawers Registration
// ============================================================================

interface DrawersRegistrationProps {
  getDrawers?: () => IDrawerDefinition[];
}

function DrawersRegistration({ getDrawers }: DrawersRegistrationProps) {
  const registeredRef = useRef(false);

  useEffect(() => {
    if (registeredRef.current || !getDrawers) return;
    registeredRef.current = true;

    const drawers = getDrawers();
    drawers.forEach((drawer) => {
      registerDrawer(drawer);
    });
  }, [getDrawers]);

  return null;
}

// ============================================================================
// Combined Provider
// ============================================================================

interface ModuleProviderProps {
  children: ReactNode;
  sidebarItems: SidebarItem[];
  getDrawers?: () => IDrawerDefinition[];
}

/**
 * Combined provider for module registry client-side state
 * Handles sidebar items context and drawer registration
 */
export function ModuleProvider({
  children,
  sidebarItems,
  getDrawers,
}: ModuleProviderProps) {
  return (
    <SidebarItemsContext.Provider value={sidebarItems}>
      <DrawersRegistration getDrawers={getDrawers} />
      {children}
    </SidebarItemsContext.Provider>
  );
}

// ============================================================================
// Legacy export for backward compatibility
// ============================================================================

/** @deprecated Use ModuleProvider instead */
export function SidebarItemsProvider({
  children,
  items
}: {
  children: ReactNode;
  items: SidebarItem[]
}) {
  return (
    <SidebarItemsContext.Provider value={items}>
      {children}
    </SidebarItemsContext.Provider>
  );
}

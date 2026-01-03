"use client";

import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import type { SidebarItem } from "./registry";
import type { IDrawerDefinition } from "@/layouts/drawers/types";
import type { IModalStackDefinition } from "@/layouts/modals/types";
import { registerDrawer } from "@/layouts/drawers/registry/drawerRegistry";
import { registerModalStackItem } from "@/layouts/modals/registry/modalRegistry";

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
  getDrawers?: () => IDrawerDefinition[];
  getModalStackItems?: () => IModalStackDefinition[];
}

/**
 * Combined provider for module registry client-side state
 * Handles sidebar items context, drawer and modal stack registration
 */
export function ModuleProvider({
  children,
  sidebarItems,
  getDrawers,
  getModalStackItems,
}: ModuleProviderProps) {
  return (
    <SidebarItemsContext.Provider value={sidebarItems}>
      <DrawersRegistration getDrawers={getDrawers} />
      <ModalStackRegistration getModalStackItems={getModalStackItems} />
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

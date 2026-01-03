"use client";

import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import type { SidebarItem } from "./registry";
import type { IModalStackDefinition } from "@/layouts/modals/types";
import { registerModalStackItem } from "@/layouts/modals/registry/modalRegistry";

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

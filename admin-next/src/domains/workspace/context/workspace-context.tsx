"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import type { ApiOrganization, ApiStore, ApiMember } from "@/graphql/types";
import { useSession } from "@/domains/auth";
import { useOrganization } from "../hooks/use-organization";
import { useStores } from "../hooks/use-stores";

// ============================================
// Types
// ============================================

export interface WorkspaceContextValue {
  /**
   * Current selected organization with full membership details.
   */
  organization: ApiOrganization | null;

  /**
   * Current selected store, or null if none selected.
   */
  store: ApiStore | null;

  /**
   * All stores in the current organization.
   */
  stores: ApiStore[];

  /**
   * Whether organization data is loading.
   */
  organizationLoading: boolean;

  /**
   * Whether stores data is loading.
   */
  storesLoading: boolean;

  /**
   * Current user's member record in the organization.
   */
  currentMember: ApiMember | null;

  /**
   * Whether current user is the organization owner.
   */
  isOwner: boolean;

  /**
   * Current user's role name in the organization.
   */
  currentRole: string | null;

  /**
   * Select a different organization by name.
   */
  selectOrganization: (name: string) => void;

  /**
   * Select a different store.
   */
  selectStore: (id: string | null) => void;

  /**
   * Refetch organization and stores data.
   */
  refresh: () => void;
}

// ============================================
// Context
// ============================================

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

// ============================================
// Provider
// ============================================

export interface WorkspaceProviderProps {
  children: ReactNode;
  /**
   * Initial organization name (from URL or storage).
   */
  initialOrganizationName?: string;
  /**
   * Initial store name (from URL path params).
   */
  initialStoreName?: string;
  /**
   * Initial store ID (from URL or storage).
   * @deprecated Use initialStoreName instead for URL-based routing.
   */
  initialStoreId?: string;
}

/**
 * Provider that manages the current workspace state.
 * Tracks selected organization and store, and provides membership info.
 *
 * @example
 * ```tsx
 * // In your app layout
 * <WorkspaceProvider initialOrganizationName={orgName}>
 *   <AppContent />
 * </WorkspaceProvider>
 * ```
 */
export function WorkspaceProvider({
  children,
  initialOrganizationName,
  initialStoreName,
  initialStoreId,
}: WorkspaceProviderProps) {
  // Get current user from auth
  const { user } = useSession();

  // State for current selections
  const [organizationName, setOrganizationName] = useState<string | undefined>(
    initialOrganizationName
  );
  const [storeName, setStoreName] = useState<string | undefined>(
    initialStoreName
  );
  const [storeId, setStoreId] = useState<string | null>(initialStoreId ?? null);

  // Fetch organization with full membership
  const {
    organization,
    loading: organizationLoading,
    refetch: refetchOrganization,
  } = useOrganization(organizationName ?? "", {
    skip: !organizationName,
  });

  // Fetch stores for the organization (use organization.id once loaded)
  const {
    stores,
    loading: storesLoading,
    refetch: refetchStores,
  } = useStores({
    organizationId: organization?.id ?? "",
    skip: !organization?.id,
  });

  // Find current user's member record
  const currentMember = useMemo(() => {
    if (!organization?.membership?.members || !user?.id) return null;
    return (
      organization.membership.members.find((m) => m.user.id === user.id) ?? null
    );
  }, [organization?.membership?.members, user?.id]);

  // Find current store from stores list (by name or id)
  const currentStore = useMemo(() => {
    if (stores.length === 0) return null;
    // Prefer name-based lookup (for URL routing)
    if (storeName) {
      return stores.find((s) => s.name === storeName) ?? null;
    }
    // Fallback to id-based lookup
    if (storeId) {
      return stores.find((s) => s.id === storeId) ?? null;
    }
    return null;
  }, [storeName, storeId, stores]);

  // Derived state
  const isOwner = currentMember?.isOwner ?? false;
  const currentRole = currentMember?.role ?? null;

  // Actions
  const selectOrganization = useCallback((name: string) => {
    setOrganizationName(name);
    setStoreName(undefined);
    setStoreId(null); // Clear store when switching organizations
  }, []);

  const selectStore = useCallback((id: string | null) => {
    setStoreId(id);
    setStoreName(undefined); // Clear name when selecting by id
  }, []);

  const refresh = useCallback(() => {
    refetchOrganization();
    refetchStores();
  }, [refetchOrganization, refetchStores]);

  // Build context value
  const value = useMemo<WorkspaceContextValue>(
    () => ({
      organization,
      store: currentStore,
      stores,
      organizationLoading,
      storesLoading,
      currentMember,
      isOwner,
      currentRole,
      selectOrganization,
      selectStore,
      refresh,
    }),
    [
      organization,
      currentStore,
      stores,
      organizationLoading,
      storesLoading,
      currentMember,
      isOwner,
      currentRole,
      selectOrganization,
      selectStore,
      refresh,
    ]
  );

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

// ============================================
// Hook
// ============================================

/**
 * Hook to access the current workspace context.
 * Must be used within a WorkspaceProvider.
 *
 * @throws Error if used outside of WorkspaceProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { organization, store, isOwner, selectStore } = useWorkspace();
 *
 *   return (
 *     <div>
 *       <h1>{organization?.displayName}</h1>
 *       {store && <p>Current store: {store.displayName}</p>}
 *       {isOwner && <button>Owner Actions</button>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useWorkspace(): WorkspaceContextValue {
  const context = useContext(WorkspaceContext);

  if (!context) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }

  return context;
}

/**
 * Hook to optionally access the workspace context.
 * Returns null if used outside of WorkspaceProvider (doesn't throw).
 *
 * @example
 * ```tsx
 * function OptionalWorkspaceDisplay() {
 *   const workspace = useWorkspaceOptional();
 *
 *   if (!workspace) {
 *     return null; // Outside provider
 *   }
 *
 *   return <div>{workspace.organization?.displayName}</div>;
 * }
 * ```
 */
export function useWorkspaceOptional(): WorkspaceContextValue | null {
  return useContext(WorkspaceContext);
}

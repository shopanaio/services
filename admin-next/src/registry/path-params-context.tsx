"use client";

import {
  createContext,
  useContext,
  useMemo,
  useCallback,
  type ReactNode,
} from "react";
import type { ParamData } from "path-to-regexp";

// ============================================================================
// Types
// ============================================================================

export interface PathParamsContextValue {
  /**
   * Current path parameters extracted from the URL.
   * E.g., { orgName: "acme", storeName: "main-store" }
   */
  pathParams: ParamData;

  /**
   * Resolve a path pattern with current path params.
   * E.g., "/:orgName/:storeName/products" -> "/acme/main-store/products"
   */
  resolvePath: (pattern: string) => string;

  /**
   * Get a specific path parameter by key.
   */
  getParam: (key: string) => string | undefined;
}

// ============================================================================
// Context
// ============================================================================

const PathParamsContext = createContext<PathParamsContextValue | null>(null);

// ============================================================================
// Provider
// ============================================================================

export interface PathParamsProviderProps {
  children: ReactNode;
  pathParams: ParamData;
}

/**
 * Provider that makes path parameters available throughout the app.
 * Wraps page components to provide access to URL path params.
 *
 * @example
 * ```tsx
 * // In layout/page rendering
 * <PathParamsProvider pathParams={{ orgName: "acme", storeName: "main" }}>
 *   <AppContent />
 * </PathParamsProvider>
 * ```
 */
export function PathParamsProvider({
  children,
  pathParams,
}: PathParamsProviderProps) {
  const resolvePath = useCallback(
    (pattern: string): string => {
      return pattern.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, (match, key) => {
        const value = pathParams[key];
        if (typeof value === "string") {
          return encodeURIComponent(value);
        }
        // Keep the pattern if no matching param
        return match;
      });
    },
    [pathParams]
  );

  const getParam = useCallback(
    (key: string): string | undefined => {
      const value = pathParams[key];
      return typeof value === "string" ? value : undefined;
    },
    [pathParams]
  );

  const value = useMemo<PathParamsContextValue>(
    () => ({
      pathParams,
      resolvePath,
      getParam,
    }),
    [pathParams, resolvePath, getParam]
  );

  return (
    <PathParamsContext.Provider value={value}>
      {children}
    </PathParamsContext.Provider>
  );
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook to access path parameters context.
 * Must be used within a PathParamsProvider.
 *
 * @throws Error if used outside of PathParamsProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { pathParams, resolvePath } = usePathParams();
 *
 *   const orgName = pathParams.orgName;
 *   const productsUrl = resolvePath("/:orgName/:storeName/products");
 *
 *   return <Link href={productsUrl}>Products</Link>;
 * }
 * ```
 */
export function usePathParams(): PathParamsContextValue {
  const context = useContext(PathParamsContext);

  if (!context) {
    throw new Error("usePathParams must be used within a PathParamsProvider");
  }

  return context;
}

/**
 * Hook to optionally access path parameters context.
 * Returns null if used outside of PathParamsProvider (doesn't throw).
 *
 * @example
 * ```tsx
 * function OptionalPathDisplay() {
 *   const pathContext = usePathParamsOptional();
 *
 *   if (!pathContext) {
 *     return null; // Outside provider
 *   }
 *
 *   return <div>Org: {pathContext.pathParams.orgName}</div>;
 * }
 * ```
 */
export function usePathParamsOptional(): PathParamsContextValue | null {
  return useContext(PathParamsContext);
}

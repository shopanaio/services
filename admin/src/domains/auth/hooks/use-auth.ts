"use client";

import { useContext } from "react";
import { AuthContext } from "../context";
import type { AuthContextValue } from "../context/types";

/**
 * Hook for consuming auth context.
 * Must be used within a SessionProvider.
 *
 * @throws Error if used outside of SessionProvider
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within a SessionProvider");
  }

  return context;
}

"use client";

import { useMemo } from "react";
import { useQuery } from "@apollo/client/react";
import { AuthContext } from "../context";
import { CURRENT_USER_QUERY } from "../graphql";
import type { ApiUser } from "@/graphql/types";
import type { AuthContextValue } from "../context/types";

interface SessionProviderProps {
  children: React.ReactNode;
}

/**
 * Session context provider component.
 * Provides current user state to the app, reactively updated via Apollo cache.
 * Auth operations (signIn, signUp, signOut) are available via separate hooks.
 */
export function SessionProvider({ children }: SessionProviderProps) {
  const { data, loading } = useQuery<{
    userQuery: { current: ApiUser | null };
  }>(CURRENT_USER_QUERY, {
    fetchPolicy: "cache-and-network",
  });

  const user = data?.userQuery?.current ?? null;
  const isAuthenticated = !!user;

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated,
      isLoading: loading,
    }),
    [user, isAuthenticated, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

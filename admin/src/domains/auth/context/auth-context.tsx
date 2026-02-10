"use client";

import { createContext } from "react";
import type { AuthContextValue } from "./types";

/**
 * React context for auth state and operations.
 * Must be consumed within a SessionProvider.
 */
export const AuthContext = createContext<AuthContextValue | null>(null);

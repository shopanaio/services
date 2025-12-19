/**
 * Admin view interfaces
 *
 * Re-export types from Casdoor SDK and define view-specific types
 */

import type { TypeResult } from "@shopana/type-resolver";
import type { User as CasdoorUser, Role as CasdoorRole } from "@zaytra/casdoor-node-client-ext";
import type { UserResolver } from "../UserResolver.js";

// ============================================================================
// Re-export types from Casdoor SDK
// ============================================================================

/** User type from Casdoor SDK */
export type { User as CasdoorUser, Role as CasdoorRole } from "@zaytra/casdoor-node-client-ext";

// ============================================================================
// Derived types from Resolver classes (auto-generated from TypeResult)
// ============================================================================

/** User type derived from UserResolver */
export type User = TypeResult<typeof UserResolver>;

// ============================================================================
// Simple value types (view-specific)
// ============================================================================

/** Supported locale codes */
export type LocaleCode = "en" | "uk" | "ru" | "de" | "fr" | "es" | "pl";

/**
 * Role view type (simplified from CasdoorRole)
 */
export interface Role {
  /** Role owner (organization) */
  owner: string;
  /** Role name/identifier */
  name: string;
  /** Human-readable display name */
  displayName: string | null;
  /** Role description */
  description: string | null;
  /** Whether the role is enabled */
  isEnabled: boolean;
}

/**
 * Authentication token information
 */
export interface AuthToken {
  /** Access token for API requests */
  accessToken: string;
  /** Token expiration time in seconds */
  expiresIn: number;
  /** Refresh token for obtaining new access tokens */
  refreshToken: string | null;
}

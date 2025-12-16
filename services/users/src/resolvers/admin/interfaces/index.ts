/**
 * Admin view interfaces
 *
 * Simple value types (manual interfaces) and derived types from Resolver classes
 */

import type { TypeResult } from "@shopana/type-resolver";
import type { CustomerResolver } from "../CustomerResolver.js";
import type { UserResolver } from "../UserResolver.js";

// ============================================================================
// Derived types from Resolver classes (auto-generated from TypeResult)
// ============================================================================

/** User type derived from UserResolver */
export type User = TypeResult<typeof UserResolver>;

/** Customer type derived from CustomerResolver */
export type Customer = TypeResult<typeof CustomerResolver>;

// ============================================================================
// Simple value types (manual interfaces - no resolvers for these)
// ============================================================================

/** Supported locale codes */
export type LocaleCode = "en" | "uk" | "ru" | "de" | "fr" | "es" | "pl";

/**
 * Role assigned to a user
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

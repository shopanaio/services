/**
 * Admin view interfaces
 *
 * Define view-specific types for the admin API
 */

import type { TypeResult } from "@shopana/type-resolver";
import type { UserResolver } from "../UserResolver.js";

// ============================================================================
// Derived types from Resolver classes (auto-generated from TypeResult)
// ============================================================================

/** User type derived from UserResolver */
export type User = TypeResult<typeof UserResolver>;

// ============================================================================
// Simple value types (view-specific)
// ============================================================================

/**
 * Role view type
 */
export interface Role {
  /** Organization ID */
  organizationId: string;
  /** Role name/identifier */
  name: string;
  /** Human-readable display name */
  displayName: string | null;
  /** Role description */
  description: string | null;
  /** Whether this is a system role */
  isSystem: boolean;
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

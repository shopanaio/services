/**
 * Store context from project service
 */
export interface ContextStore {
  id: string;
  name: string;
  displayName: string;
  organizationId: string;
  timezone: string;
  email: string | null;
  defaultLocale: string;
  currencyCode: string;
  /** ISO 4217 minor-unit exponent resolved by the Store bounded context. */
  currencyExponent?: number;
  /** Revision of fields that affect deterministic segment evaluation. */
  segmentConfigurationRevision?: number;
  /** Active locale codes from the Store bounded context. */
  locales: readonly string[];
}

/**
 * User context from IAM service (for admin APIs)
 */
export interface ContextUser {
  id: string;
  name: string;
  email?: string;
}

/**
 * Customer context (for storefront APIs)
 */
export interface ContextCustomer {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  language: string | null;
  isVerified: boolean;
  isBlocked: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Broker result types
 */
export interface UserError {
  code: string;
  message: string;
  field?: string[];
}

export interface GetCurrentUserResult {
  user: ContextUser | null;
  userErrors: UserError[];
}

export interface GetCurrentStoreResult {
  store: ContextStore | null;
  userErrors: UserError[];
}

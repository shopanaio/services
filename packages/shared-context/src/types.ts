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
  defaultCurrency: string;
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
  email: string;
  firstName: string;
  lastName: string;
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

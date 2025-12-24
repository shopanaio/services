import type { CoreCustomer, CoreStore, CoreUser } from "@shopana/platform-api";

/**
 * Checkout service execution context
 * Contains essential business context data available throughout request lifecycle
 */
export interface CheckoutContext {
  /** API key for the request */
  apiKey: string;
  /** Current store - required for all operations */
  store: CoreStore;
  /** Optional authenticated user */
  user?: CoreUser | null;
  /** Optional customer context */
  customer?: CoreCustomer | null;
}

import type { CoreCustomer, CoreStore, CoreUser } from "@shopana/platform-api";
import type { ContextStorefrontAccess } from "@shopana/shared-context";

/**
 * Checkout service execution context
 * Contains essential business context data available throughout request lifecycle
 */
export interface CheckoutContext {
  /** Verified Headless storefront identity for the request. */
  storefrontAccess: ContextStorefrontAccess;
  /** Current store - required for all operations */
  store: CoreStore;
  /** Optional authenticated user */
  user?: CoreUser | null;
  /** Optional customer context */
  customer?: CoreCustomer | null;
}

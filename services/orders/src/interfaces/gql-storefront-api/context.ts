import type { CoreCustomer, CoreStore, CoreUser } from "@shopana/platform-api";
import type { ContextStorefrontAccess } from "@shopana/shared-context";

/**
 * GraphQL context for order service
 * Simplified context focusing on essential business data
 */
export type GraphQLContext = {
  /**
   * Unique request ID at the Fastify level.
   * Use for local diagnostics.
   */
  requestId: string;
  /**
   * API key.
   */
  apiKey: string;
  storefrontAccess: ContextStorefrontAccess;
  /**
   * Current store. Required for all operations.
   */
  store: CoreStore;
  user?: CoreUser | null;
  customer?: CoreCustomer | null;
};

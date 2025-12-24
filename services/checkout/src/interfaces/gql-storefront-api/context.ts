import type { CoreCustomer, CoreStore, CoreUser } from "@shopana/platform-api";

/**
 * GraphQL context for checkout service
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
  /**
   * Current store. Required for all operations.
   */
  store: CoreStore;
  user?: CoreUser | null;
  customer?: CoreCustomer | null;
  /**
   * Client IP address (as seen by Fastify), if available.
   */
  ip?: string;
  /**
   * Request headers snapshot passed to resolvers for idempotency hashing.
   * Only safe headers exposed by server layer.
   */
  headers?: Record<string, string | string[] | undefined>;
};

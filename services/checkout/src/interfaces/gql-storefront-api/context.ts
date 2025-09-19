import type { CoreCustomer, CoreProject, CoreUser } from "@shopana/platform-api";

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
   * Current project. Required for all operations.
   */
  project: CoreProject;
  user?: CoreUser | null;
  customer?: CoreCustomer | null;
};

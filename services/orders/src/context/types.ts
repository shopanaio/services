import type { CoreCustomer, CoreProject, CoreUser } from "@shopana/platform-api";

/**
 * Order service execution context
 * Contains essential business context data available throughout request lifecycle
 */
export interface OrderContext {
  /** API key for the request */
  apiKey: string;
  /** Current project - required for all operations */
  project: CoreProject;
  /** Optional authenticated user */
  user?: CoreUser | null;
  /** Optional customer context */
  customer?: CoreCustomer | null;
}

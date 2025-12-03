import type { CoreProject, CoreUser } from "@shopana/platform-api";

/**
 * Inventory service execution context
 * Contains essential business context data available throughout request lifecycle
 */
export interface InventoryContext {
  /** Project slug from header */
  slug: string;
  /** Current project - required for all operations */
  project: CoreProject;
  /** Authenticated user for admin API */
  user: CoreUser;
}

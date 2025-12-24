import type { CoreStore, CoreUser } from "@shopana/platform-api";

/**
 * Media service execution context
 * Contains essential business context data available throughout request lifecycle
 */
export interface MediaContext {
  /** Store slug from header */
  slug: string;
  /** Current store - required for all operations */
  store: CoreStore;
  /** Authenticated user for admin API */
  user: CoreUser;
}

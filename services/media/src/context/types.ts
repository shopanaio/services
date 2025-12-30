import type { CoreStore, CoreUser } from "@shopana/platform-api";
import type { Kernel } from "../kernel/Kernel.js";
import type { Loader } from "../loaders/Loader.js";

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

/**
 * Service context for type resolvers
 * Contains all request-scoped data available throughout request lifecycle
 */
export interface ServiceContext {
  /** Unique request identifier */
  requestId: string;
  /** Kernel for business logic */
  kernel: Kernel;
  /** Current store context */
  store: CoreStore;
  /** Current user context */
  user: CoreUser;
  /** Data loaders for batch loading */
  loaders: Loader;
}

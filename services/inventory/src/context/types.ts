import type { CoreStore, CoreUser } from "@shopana/platform-api";
import type { Kernel } from "../kernel/Kernel.js";
import type { Loader } from "../loaders/Loader.js";

/**
 * Unified service context for inventory service
 * Contains all request-scoped data available throughout request lifecycle
 */
export interface ServiceContext {
  /** Unique request identifier */
  requestId: string;
  /** Store slug from header */
  slug: string;
  /** Current store - required for all operations */
  store: CoreStore;
  /** Authenticated user for admin API */
  user: CoreUser;
  /** Current locale for translations (default: 'uk') */
  locale?: string;
  /** Current currency for pricing */
  currency?: string;
  /** DataLoaders for efficient batched data fetching */
  loaders: Loader;
  /** Kernel for business logic */
  kernel: Kernel;
}

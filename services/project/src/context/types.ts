import type { Kernel } from "../kernel/Kernel.js";
import type { Loader } from "../loaders/Loader.js";
import type { Store } from "../repositories/index.js";

/**
 * Store entity from context - full store with integrations
 */
export type ContextStore = Store;

/**
 * User entity from context
 */
export interface ContextUser {
  id: string;
}

/**
 * Unified service context for project service
 * Contains all request-scoped data available throughout request lifecycle
 */
export interface ServiceContext {
  /** Unique request identifier */
  requestId: string;
  /** Store slug from header */
  slug?: string;
  /** Current store (optional - may not exist for org-level operations) */
  store?: ContextStore;
  /** Authenticated user (optional - may be API key auth) */
  user?: ContextUser;
  /** Current locale for translations (default: 'uk') */
  locale?: string;
  /** Kernel for business logic */
  kernel: Kernel;
  /** DataLoaders for efficient batched data fetching */
  loaders: Loader;
}

import type { Kernel } from "../kernel/Kernel.js";

/**
 * Project entity from context
 */
export interface ContextProject {
  id: string;
  slug: string;
}

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
  /** Project slug from header */
  slug: string;
  /** Current project - required for all operations */
  project: ContextProject;
  /** Authenticated user for admin API */
  user: ContextUser;
  /** Current locale for translations (default: 'uk') */
  locale?: string;
  /** Kernel for business logic */
  kernel: Kernel;
}

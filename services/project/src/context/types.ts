import type { Kernel } from "../kernel/Kernel.js";
import type { StoreWithIntegrations } from "../repositories/index.js";

/**
 * Store entity from context - full store with integrations
 * organizationId is extracted from integrations.iam.config for convenience
 */
export interface ContextStore extends StoreWithIntegrations {
  /** Organization ID from IAM integration (shortcut) */
  organizationId: string;
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
  /** Store slug from header */
  slug: string;
  /** Current store - required for all operations */
  store: ContextStore;
  /** Authenticated user (optional - may be API key auth) */
  user?: ContextUser;
  /** Current locale for translations (default: 'uk') */
  locale?: string;
  /** Kernel for business logic */
  kernel: Kernel;
}

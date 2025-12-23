import type { Kernel } from "../kernel/Kernel.js";
import type { ProjectWithIntegrations } from "../repositories/index.js";

/**
 * Project entity from context - full project with integrations
 * organizationId is extracted from integrations.iam.config for convenience
 */
export interface ContextProject extends ProjectWithIntegrations {
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
  /** Project slug from header */
  slug: string;
  /** Current project - required for all operations */
  project: ContextProject;
  /** Authenticated user (optional - may be API key auth) */
  user?: ContextUser;
  /** Current locale for translations (default: 'uk') */
  locale?: string;
  /** Kernel for business logic */
  kernel: Kernel;
}

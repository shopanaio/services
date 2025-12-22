import type { Kernel } from "../kernel/Kernel.js";
import type { User } from "../repositories/index.js";

/**
 * Unified service context for users service
 * Contains all request-scoped data available throughout request lifecycle
 */
export interface ServiceContext {
  /** Unique request identifier */
  requestId: string;
  /** Kernel for business logic */
  kernel: Kernel;
  /** Current authenticated user (null if not authenticated) */
  currentUser: User | null;
  /** Current tenant/project ID (project slug) */
  tenantId: string | null;
  /** Current project slug from X-Project-Name header */
  projectSlug: string | null;
}

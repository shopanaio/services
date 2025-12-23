import type { Kernel } from "../kernel/Kernel.js";
import type { User } from "../repositories/index.js";

/**
 * Unified service context for IAM service.
 * Contains all request-scoped data available throughout request lifecycle.
 */
export interface ServiceContext {
  /** Unique request identifier */
  requestId: string;
  /** Kernel for business logic */
  kernel: Kernel;
  /** Current authenticated user (null if not authenticated) */
  currentUser: User | null;
  /** Organization ID from JWT org claim */
  organizationId: string | null;
}

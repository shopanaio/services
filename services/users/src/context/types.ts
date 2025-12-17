import type { Kernel } from "../kernel/Kernel.js";

/**
 * Unified service context for users service
 * Contains all request-scoped data available throughout request lifecycle
 */
export interface ServiceContext {
  /** Unique request identifier */
  requestId: string;
  /** Kernel for business logic */
  kernel: Kernel;
}

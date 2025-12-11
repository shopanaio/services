import type { CoreProject, CoreUser } from "@shopana/platform-api";
import type { Kernel } from "../kernel/Kernel.js";
import type { ProductLoaders } from "../resolvers/admin/context.js";

/**
 * Unified service context for inventory service
 * Contains all request-scoped data available throughout request lifecycle
 */
export interface ServiceContext {
  /** Unique request identifier */
  requestId: string;
  /** Project slug from header */
  slug: string;
  /** Current project - required for all operations */
  project: CoreProject;
  /** Authenticated user for admin API */
  user: CoreUser;
  /** Current locale for translations (default: 'uk') */
  locale?: string;
  /** Current currency for pricing */
  currency?: string;
  /** DataLoaders for efficient batched data fetching */
  loaders: ProductLoaders;
  /** Kernel for business logic */
  kernel: Kernel;
}

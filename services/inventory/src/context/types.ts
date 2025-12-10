import type { CoreProject, CoreUser } from "@shopana/platform-api";
import type { Kernel } from "../kernel/Kernel.js";
import type { ProductLoaders } from "../views/admin/context.js";

/**
 * Inventory service execution context
 * Contains essential business context data available throughout request lifecycle
 */
export interface InventoryContext {
  /** Project slug from header */
  slug: string;
  /** Current project - required for all operations */
  project: CoreProject;
  /** Authenticated user for admin API */
  user: CoreUser;
  /** Current locale for translations (default: 'uk') */
  locale?: string;
  /** DataLoaders for efficient batched data fetching */
  loaders: ProductLoaders;
  /** Kernel for business logic */
  kernel: Kernel;
}

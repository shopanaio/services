import type { CoreProject, CoreUser } from "@shopana/platform-api";
import type { Kernel } from "../kernel/Kernel.js";
import type { UserData } from "../repositories/user/UserRepository.js";
import type { CustomerData } from "../repositories/customer/CustomerRepository.js";

/**
 * DataLoaders for users service
 */
export interface Loader {
  user: {
    load: (id: string) => Promise<UserData | null>;
  };
  customer: {
    load: (id: string) => Promise<CustomerData | null>;
  };
}

/**
 * Unified service context for users service
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
  /** DataLoaders for efficient batched data fetching */
  loaders: Loader;
  /** Kernel for business logic */
  kernel: Kernel;
}

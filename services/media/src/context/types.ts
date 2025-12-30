import type { CoreStore, CoreUser } from "@shopana/platform-api";
import type { Kernel } from "../kernel/Kernel.js";
import type { Loader } from "../loaders/Loader.js";

/**
 * Context initialization options
 */
export interface ServiceContextOptions {
  requestId: string;
  kernel: Kernel;
  loaders: Loader;
  /** Current store - required for all operations */
  store?: CoreStore;
  /** Authenticated user for admin API */
  user?: CoreUser;
}

/**
 * Unified service context for media service.
 * Contains all request-scoped data available throughout request lifecycle.
 */
export class ServiceContext {
  /** Unique request identifier */
  readonly requestId: string;
  /** Kernel for business logic */
  readonly kernel: Kernel;
  /** DataLoaders for efficient batched data fetching */
  readonly loaders: Loader;

  private _store?: CoreStore;
  private _user?: CoreUser;

  constructor(options: ServiceContextOptions) {
    this.requestId = options.requestId;
    this.kernel = options.kernel;
    this.loaders = options.loaders;
    this._store = options.store;
    this._user = options.user;
  }

  /** Current store context */
  get store(): CoreStore {
    if (!this._store) {
      throw new Error("Store not available in context");
    }
    return this._store;
  }

  /** Current user context */
  get user(): CoreUser {
    if (!this._user) {
      throw new Error("User not available in context");
    }
    return this._user;
  }

  /** Check if store is available */
  get hasStore(): boolean {
    return !!this._store;
  }

  /** Check if user is available */
  get hasUser(): boolean {
    return !!this._user;
  }
}

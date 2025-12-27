import type { Kernel } from "../kernel/Kernel.js";
import type { Loader } from "../loaders/Loader.js";
import type { Store } from "../repositories/index.js";

/**
 * Store entity from context - full store with integrations
 */
export type ContextStore = Store;

/**
 * User entity from context
 */
export interface ContextUser {
  id: string;
}

/**
 * Context initialization options
 */
export interface ServiceContextOptions {
  requestId: string;
  kernel: Kernel;
  loaders: Loader;
  /** Store slug from X-Store-Name header */
  storeName?: string;
  user?: ContextUser;
  locale?: string;
}

/**
 * Unified service context for project service.
 * Contains all request-scoped data available throughout request lifecycle.
 * Store is loaded lazily via currentStore query.
 */
export class ServiceContext {
  /** Unique request identifier */
  readonly requestId: string;
  /** Kernel for business logic */
  readonly kernel: Kernel;
  /** DataLoaders for efficient batched data fetching */
  readonly loaders: Loader;
  /** Store slug from X-Store-Name header */
  readonly storeName?: string;
  /** Current locale for translations (default: 'uk') */
  readonly locale?: string;

  private _store?: ContextStore;
  private _user?: ContextUser;

  constructor(options: ServiceContextOptions) {
    this.requestId = options.requestId;
    this.kernel = options.kernel;
    this.loaders = options.loaders;
    this.storeName = options.storeName;
    this.locale = options.locale;
    this._user = options.user;
  }

  /** Current store (lazily loaded via currentStore query) */
  get store(): ContextStore | undefined {
    return this._store;
  }

  /** Set current store (called by currentStore query) */
  setStore(store: ContextStore): this {
    this._store = store;
    return this;
  }

  /** Authenticated user */
  get user(): ContextUser | undefined {
    return this._user;
  }

  /** Set current user */
  setUser(user: ContextUser): this {
    this._user = user;
    return this;
  }
}

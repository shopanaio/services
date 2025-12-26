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
  slug?: string;
  store?: ContextStore;
  user?: ContextUser;
  locale?: string;
  organizationId?: string;
}

/**
 * Unified service context for project service
 * Contains all request-scoped data available throughout request lifecycle
 */
export class ServiceContext {
  /** Unique request identifier */
  readonly requestId: string;
  /** Kernel for business logic */
  readonly kernel: Kernel;
  /** DataLoaders for efficient batched data fetching */
  readonly loaders: Loader;
  /** Store slug from header */
  readonly slug?: string;
  /** Current locale for translations (default: 'uk') */
  readonly locale?: string;
  /** Organization ID from header (for org-level operations like listing stores) */
  readonly organizationId?: string;

  private _store?: ContextStore;
  private _user?: ContextUser;

  constructor(options: ServiceContextOptions) {
    this.requestId = options.requestId;
    this.kernel = options.kernel;
    this.loaders = options.loaders;
    this.slug = options.slug;
    this.locale = options.locale;
    this.organizationId = options.organizationId;
    this._store = options.store;
    this._user = options.user;
  }

  /** Current store (optional - may not exist for org-level operations) */
  get store(): ContextStore | undefined {
    return this._store;
  }

  /** Set current store */
  setStore(store: ContextStore): this {
    this._store = store;
    return this;
  }

  /** Authenticated user (optional - may be API key auth) */
  get user(): ContextUser | undefined {
    return this._user;
  }

  /** Set current user */
  setUser(user: ContextUser): this {
    this._user = user;
    return this;
  }
}

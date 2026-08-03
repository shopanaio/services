import type {
  AdminContextClaims,
  ContextStore,
  ContextStorefrontAccess,
  ContextUser,
} from "@shopana/shared-context";
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
  store?: ContextStore;
  /** Authenticated user for admin API */
  user?: ContextUser;
  /** Verified authorization claims issued by the Admin Gateway */
  adminContext?: AdminContextClaims;
  /** Store identity verified by the Storefront Gateway */
  storefrontStore?: ContextStore;
  /** Storefront credential and permission claims verified by the gateway */
  storefrontAccess?: ContextStorefrontAccess;
  /** Store slug from the verified storefront context */
  storeName?: string;
  /** Current storefront locale */
  locale?: string;
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
  /** Verified authorization claims issued by the Admin Gateway */
  readonly adminContext?: AdminContextClaims;
  /** Store identity verified by the Storefront Gateway */
  readonly storefrontStore?: ContextStore;
  /** Storefront credential and permission claims verified by the gateway */
  readonly storefrontAccess?: ContextStorefrontAccess;
  /** Store slug from the verified storefront context */
  readonly storeName?: string;
  /** Current storefront locale */
  readonly locale?: string;

  private _store?: ContextStore;
  private _user?: ContextUser;

  constructor(options: ServiceContextOptions) {
    this.requestId = options.requestId;
    this.kernel = options.kernel;
    this.loaders = options.loaders;
    this.adminContext = options.adminContext;
    this.storefrontStore = options.storefrontStore;
    this.storefrontAccess = options.storefrontAccess;
    this.storeName = options.storeName;
    this.locale = options.locale;
    this._store = options.store;
    this._user = options.user;
  }

  /** Current store context */
  get store(): ContextStore {
    if (!this._store) {
      throw new Error("Store not available in context");
    }
    return this._store;
  }

  /** Current user context */
  get user(): ContextUser {
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

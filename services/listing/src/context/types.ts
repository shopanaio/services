import type {
  AdminContextClaims,
  ContextCustomer,
  ContextStorefrontAccess,
  ContextStore,
  ContextUser,
} from "@shopana/shared-context";
import type { Kernel } from "../kernel/Kernel.js";
import type { Loader } from "../loaders/Loader.js";

export interface ServiceGraphqlError {
  message: string;
  field?: string[];
  code?: string;
}

export interface ServiceContextOptions {
  requestId: string;
  kernel: Kernel;
  loaders: Loader;
  store?: ContextStore;
  user?: ContextUser;
  adminContext?: AdminContextClaims;
  storefrontAccess?: ContextStorefrontAccess;
  customer?: ContextCustomer | null;
  locale?: string;
  currency?: string;
}

export class ServiceContext {
  readonly requestId: string;
  readonly kernel: Kernel;
  readonly loaders: Loader;
  readonly locale?: string;
  readonly currency?: string;
  readonly adminContext?: AdminContextClaims;
  readonly storefrontAccess?: ContextStorefrontAccess;
  readonly customer?: ContextCustomer | null;

  private _store?: ContextStore;
  private _user?: ContextUser;
  private readonly graphqlErrors: ServiceGraphqlError[] = [];

  constructor(options: ServiceContextOptions) {
    this.requestId = options.requestId;
    this.kernel = options.kernel;
    this.loaders = options.loaders;
    this.locale = options.locale;
    this.currency = options.currency;
    this.adminContext = options.adminContext;
    this.storefrontAccess = options.storefrontAccess;
    this.customer = options.customer;
    this._store = options.store;
    this._user = options.user;
  }

  get store(): ContextStore {
    if (!this._store) {
      throw new Error("Store not available in context");
    }
    return this._store;
  }

  get user(): ContextUser {
    if (!this._user) {
      throw new Error("User not available in context");
    }
    return this._user;
  }

  get hasStore(): boolean {
    return !!this._store;
  }

  get hasUser(): boolean {
    return !!this._user;
  }

  get project(): ContextStore {
    return this.store;
  }

  addGraphqlError(error: ServiceGraphqlError): void {
    this.graphqlErrors.push(error);
  }

  getGraphqlErrors(): readonly ServiceGraphqlError[] {
    return this.graphqlErrors;
  }
}

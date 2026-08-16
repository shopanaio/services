import type {
  AdminContextClaims,
  ContextCustomer,
  ContextStore,
  ContextStorefrontAccess,
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

  private readonly currentStore?: ContextStore;
  private readonly currentUser?: ContextUser;
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
    this.currentStore = options.store;
    this.currentUser = options.user;
  }

  get store(): ContextStore {
    if (!this.currentStore) {
      throw new Error("Store not available in context");
    }
    return this.currentStore;
  }

  get user(): ContextUser {
    if (!this.currentUser) {
      throw new Error("User not available in context");
    }
    return this.currentUser;
  }

  get hasStore(): boolean {
    return this.currentStore !== undefined;
  }

  get hasUser(): boolean {
    return this.currentUser !== undefined;
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

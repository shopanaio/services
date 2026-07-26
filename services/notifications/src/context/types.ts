import type {
  AdminContextClaims,
  ContextStore,
  ContextUser,
} from "@shopana/shared-context";
import type { Kernel } from "../kernel/Kernel.js";
import type { Loader } from "../loaders/Loader.js";

export interface ServiceContextOptions {
  requestId: string;
  kernel: Kernel;
  loaders: Loader;
  store?: ContextStore;
  user?: ContextUser;
  adminContext?: AdminContextClaims;
  locale?: string;
}

export class ServiceContext {
  readonly requestId: string;
  readonly kernel: Kernel;
  readonly loaders: Loader;
  readonly locale?: string;
  readonly adminContext?: AdminContextClaims;
  private readonly storeValue?: ContextStore;
  private readonly userValue?: ContextUser;

  constructor(options: ServiceContextOptions) {
    this.requestId = options.requestId;
    this.kernel = options.kernel;
    this.loaders = options.loaders;
    this.adminContext = options.adminContext;
    this.storeValue = options.store;
    this.userValue = options.user;
    this.locale = options.locale;
  }

  get store(): ContextStore {
    if (!this.storeValue) throw new Error("Store is not available in context");
    return this.storeValue;
  }

  get user(): ContextUser {
    if (!this.userValue) throw new Error("User is not available in context");
    return this.userValue;
  }

  get hasUser(): boolean {
    return this.userValue !== undefined;
  }
}

import type { ContextStore, ContextUser } from "@shopana/shared-context";
import type { Kernel } from "../kernel/Kernel.js";

export interface ServiceContextOptions {
  requestId: string;
  kernel: Kernel;
  store?: ContextStore;
  user?: ContextUser;
  locale?: string;
}

export class ServiceContext {
  readonly requestId: string;
  readonly kernel: Kernel;
  readonly locale?: string;
  private readonly storeValue?: ContextStore;
  private readonly userValue?: ContextUser;

  constructor(options: ServiceContextOptions) {
    this.requestId = options.requestId;
    this.kernel = options.kernel;
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

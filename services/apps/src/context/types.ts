import type { ContextStore, ContextUser } from "@shopana/shared-context";
import type { ServiceBroker } from "@shopana/shared-kernel";
import type { AppInstallationStore } from "../control-plane/AppInstallationStore.js";
import type { AppLifecycleService } from "../control-plane/AppLifecycleService.js";
import type { Repository } from "../repositories/Repository.js";
import type { AppRuntimeRegistry } from "../runtime/AppRuntimeRegistry.js";
import type { SalesChannelLifecycleService } from "../sales-channels/control-plane/SalesChannelLifecycleService.js";

export interface ServiceContextOptions {
  requestId: string;
  broker: ServiceBroker;
  repository: Repository;
  installations: AppInstallationStore;
  lifecycle: AppLifecycleService;
  runtimes: AppRuntimeRegistry;
  salesChannelLifecycle: SalesChannelLifecycleService;
  store?: ContextStore;
  user?: ContextUser;
}

/**
 * Request-scoped context for the Apps admin control plane.
 */
export class ServiceContext {
  readonly requestId: string;
  readonly broker: ServiceBroker;
  readonly repository: Repository;
  readonly installations: AppInstallationStore;
  readonly lifecycle: AppLifecycleService;
  readonly runtimes: AppRuntimeRegistry;
  readonly salesChannelLifecycle: SalesChannelLifecycleService;

  private readonly currentStore?: ContextStore;
  private readonly currentUser?: ContextUser;

  constructor(options: ServiceContextOptions) {
    this.requestId = options.requestId;
    this.broker = options.broker;
    this.repository = options.repository;
    this.installations = options.installations;
    this.lifecycle = options.lifecycle;
    this.runtimes = options.runtimes;
    this.salesChannelLifecycle = options.salesChannelLifecycle;
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
    return Boolean(this.currentStore);
  }

  get hasUser(): boolean {
    return Boolean(this.currentUser);
  }
}

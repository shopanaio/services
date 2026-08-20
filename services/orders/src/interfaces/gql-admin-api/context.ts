import type { AdminContextClaims, ContextStore, ContextUser } from "@shopana/shared-context";
import type { ServiceBroker } from "@shopana/shared-kernel";
import type { Loader } from "../../loaders/Loader.js";
import type { Repository } from "../../repositories/Repository.js";

export interface GraphQLContextOptions {
  requestId: string;
  broker: ServiceBroker;
  repository: Repository;
  loaders: Loader;
  store?: ContextStore;
  user?: ContextUser;
  adminContext?: AdminContextClaims;
}

/** Request-scoped, verified Admin GraphQL context. */
export class GraphQLContext {
  readonly requestId: string;
  readonly broker: ServiceBroker;
  readonly repository: Repository;
  readonly loaders: Loader;
  readonly adminContext?: AdminContextClaims;
  private readonly currentStore?: ContextStore;
  private readonly currentUser?: ContextUser;

  constructor(options: GraphQLContextOptions) {
    this.requestId = options.requestId;
    this.broker = options.broker;
    this.repository = options.repository;
    this.loaders = options.loaders;
    this.adminContext = options.adminContext;
    this.currentStore = options.store;
    this.currentUser = options.user;
  }

  get store(): ContextStore {
    if (!this.currentStore) throw new Error("Store not available in Admin context");
    return this.currentStore;
  }

  get user(): ContextUser {
    if (!this.currentUser) throw new Error("User not available in Admin context");
    return this.currentUser;
  }

  get hasStore(): boolean {
    return Boolean(this.currentStore);
  }

  get hasUser(): boolean {
    return Boolean(this.currentUser);
  }
}

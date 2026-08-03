import {
  createAuthorizationLoader,
  type AuthorizationLoader,
} from "./AuthorizationLoader.js";
import type { AdminContextClaims } from "@shopana/shared-context";
import type { Repository } from "../repositories/Repository.js";
import { StoreLoader } from "./StoreLoader.js";
import { MarketLoader } from "./MarketLoader.js";

/**
 * Aggregates all DataLoaders for the project service.
 * Create one instance per request for proper batching within request scope.
 */
export class Loader {
  /** Authorization loader for batched permission checks */
  public readonly authorization: AuthorizationLoader;
  public readonly store;
  public readonly market;
  public readonly storeSettings;

  constructor(
    repository: Repository,
    adminContext?: AdminContextClaims,
    storefrontStoreId?: string,
  ) {
    this.authorization = createAuthorizationLoader(adminContext);
    const storeLoader = new StoreLoader(repository, storefrontStoreId);
    const marketLoader = new MarketLoader(repository, storefrontStoreId);
    this.store = storeLoader.store;
    this.storeSettings = storeLoader.storeSettings;
    this.market = marketLoader.market;
  }
}

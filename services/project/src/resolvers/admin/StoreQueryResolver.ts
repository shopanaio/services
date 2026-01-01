import {
  decodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import { BaseResolver } from "./BaseResolver.js";
import { StoreResolver } from "./StoreResolver.js";

interface StoresArgs {
  organizationId: string;
}

/**
 * StoreQuery namespace resolver.
 * Handles all store-related queries.
 */
export class StoreQueryResolver extends BaseResolver<Record<string, never>> {
  /**
   * Get all stores in the organization that the user has access to.
   */
  async stores(args: StoresArgs) {
    const organizationId = decodeGlobalIdByType(
      args.organizationId,
      GlobalIdEntity.Organization
    );

    // User must be authenticated
    if (!this.$ctx.user?.id) return [];

    // Get all stores in the organization
    const allStores = await this.$ctx.kernel
      .getServices()
      .repository.store.findByOrganization(organizationId);

    if (allStores.length === 0) return [];

    // Build batch enforce requests
    const requests = allStores.map((store) => ({
      userId: this.$ctx.user!.id,
      domain: `store:${store.id}`,
      resource: "store.profile",
      action: "read",
    }));

    // Check permissions for all stores at once
    const { results } = (await this.$ctx.kernel
      .getServices()
      .broker.call("iam.batchAuthorize", { organizationId, requests })) as {
      results: boolean[];
    };

    // Filter allowed stores
    const accessibleStores = allStores.filter((_, i) => results[i]);

    if (accessibleStores.length === 0) return [];

    // Return StoreResolver instances - executor will handle resolution
    return accessibleStores.map((store) => new StoreResolver(store, this.$ctx));
  }

  /**
   * Get current store by storeName from header.
   */
  async currentStore() {
    // Need storeName from header and authenticated user
    if (!this.$ctx.user || !this.$ctx.storeName) return null;

    const store = await this.$ctx.kernel
      .getServices()
      .repository.store.findByName(this.$ctx.storeName);

    if (!store) {
      return null;
    }

    return new StoreResolver(store, this.$ctx);
  }

  /**
   * Get API keys for the current store.
   */
  async apiKeys() {
    // TODO: Implement API keys query
    return [];
  }
}

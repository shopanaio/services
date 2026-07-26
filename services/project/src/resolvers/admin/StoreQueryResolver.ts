import {
  decodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import { authorizeAdminContext } from "@shopana/shared-context";
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

    const adminContext = this.$ctx.adminContext;
    const selectedStore = adminContext?.store;
    const subject = this.$ctx.user.id;
    const hasOrganizationAccess = authorizeAdminContext(adminContext, {
      subject,
      organizationId,
      domain: "org",
      resource: "store.profile",
      action: "read",
    });
    const hasSelectedStoreAccess = selectedStore
      ? authorizeAdminContext(adminContext, {
          subject,
          organizationId,
          domain: `store:${selectedStore.id}`,
          resource: "store.profile",
          action: "read",
        })
      : false;

    if (!hasOrganizationAccess && !hasSelectedStoreAccess) return [];

    const allStores = await this.$ctx.kernel
      .getServices()
      .repository.store.findByOrganization(organizationId);
    if (allStores.length === 0) return [];

    const accessibleStores = hasOrganizationAccess
      ? allStores
      : hasSelectedStoreAccess
        ? allStores.filter((store) => store.id === selectedStore?.id)
        : [];

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
}

import type { InventoryItemConnectionInput } from "../../repositories/inventory-item/InventoryItemRepository.js";
import {
  BaseConnectionResolver,
  type ConnectionData,
} from "./connection/BaseConnectionResolver.js";

export type InventoryItemConnectionResolverInput =
  InventoryItemConnectionInput;

/**
 * InventoryItemConnection - resolves paginated inventory item list.
 */
export class InventoryItemConnectionResolver extends BaseConnectionResolver<InventoryItemConnectionResolverInput> {
  async $preload(): Promise<ConnectionData> {
    return this.$ctx.kernel
      .getServices()
      .repository.inventoryItem.getConnection(this.$props);
  }

  protected async createNodeResolver(nodeId: string) {
    return this.resolvers.inventoryItem(nodeId);
  }
}

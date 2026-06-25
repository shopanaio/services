import type { InventoryItemConnectionInput } from "../../repositories/inventory-item/InventoryItemRepository.js";
import { InventoryItemResolver } from "./InventoryItemResolver.js";
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

  protected createNodeResolver(nodeId: string) {
    return new InventoryItemResolver(nodeId, this.$ctx);
  }
}

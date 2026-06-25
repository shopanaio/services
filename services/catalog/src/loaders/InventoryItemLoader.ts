import DataLoader from "dataloader";
import type { InventoryItem } from "../repositories/models/index.js";
import type { Repository } from "../repositories/Repository.js";

/**
 * InventoryItemLoader - DataLoader for InventoryItem entities.
 *
 * Provides batched loading for:
 * - inventoryItem: Load by InventoryItem ID
 * - inventoryItemByVariant: Load by Variant ID (for federation)
 */
export class InventoryItemLoader {
  public readonly inventoryItem: DataLoader<string, InventoryItem | null>;
  public readonly inventoryItemByVariant: DataLoader<string, InventoryItem | null>;

  constructor(repository: Repository) {
    // Load InventoryItem by ID
    this.inventoryItem = new DataLoader<string, InventoryItem | null>(
      async (ids) => {
        const items = await repository.inventoryItem.findActiveByIds([...ids]);
        const map = new Map(items.map((item) => [item.id, item]));
        return ids.map((id) => map.get(id) ?? null);
      }
    );

    // Load InventoryItem by Variant ID (for federation)
    this.inventoryItemByVariant = new DataLoader<string, InventoryItem | null>(
      async (variantIds) => {
        const items = await repository.inventoryItem.findActiveByVariantIds([...variantIds]);
        const map = new Map(items.map((item) => [item.variantId, item]));
        return variantIds.map((id) => map.get(id) ?? null);
      }
    );
  }
}

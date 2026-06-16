import DataLoader from "dataloader";
import type { Repository } from "../repositories/Repository.js";
import { WarehouseLoader } from "./WarehouseLoader.js";
import { InventoryItemLoader } from "./InventoryItemLoader.js";

export class Loader {
  // Warehouse
  public readonly warehouse;

  // InventoryItem
  public readonly inventoryItem;
  public readonly inventoryItemByVariant;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: DataLoader<any, any>;

  constructor(repository: Repository) {
    const warehouseLoader = new WarehouseLoader(repository);
    const inventoryItemLoader = new InventoryItemLoader(repository);

    // Warehouse
    this.warehouse = warehouseLoader.warehouse;

    // InventoryItem
    this.inventoryItem = inventoryItemLoader.inventoryItem;
    this.inventoryItemByVariant = inventoryItemLoader.inventoryItemByVariant;
  }
}

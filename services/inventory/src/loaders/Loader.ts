import DataLoader from "dataloader";
import type { Repository } from "../repositories/Repository.js";
import { WarehouseLoader } from "./WarehouseLoader.js";
import { InventoryItemLoader } from "./InventoryItemLoader.js";
import { StockLoader } from "./StockLoader.js";

export class Loader {
  // Warehouse
  public readonly warehouse;

  // InventoryItem
  public readonly inventoryItem;
  public readonly inventoryItemByVariant;

  // Stock
  public readonly stockByVariant;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: DataLoader<any, any>;

  constructor(repository: Repository) {
    const warehouseLoader = new WarehouseLoader(repository);
    const inventoryItemLoader = new InventoryItemLoader(repository);
    const stockLoader = new StockLoader(repository);

    // Warehouse
    this.warehouse = warehouseLoader.warehouse;

    // InventoryItem
    this.inventoryItem = inventoryItemLoader.inventoryItem;
    this.inventoryItemByVariant = inventoryItemLoader.inventoryItemByVariant;

    // Stock
    this.stockByVariant = stockLoader.stockByVariant;
  }
}

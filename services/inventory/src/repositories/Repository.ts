import { TransactionManager } from "@shopana/shared-kernel";
import type { Database } from "../infrastructure/db/database";
import { CostRepository } from "./cost/CostRepository.js";
import { PhysicalRepository } from "./physical/PhysicalRepository.js";
import { StockRepository } from "./stock/StockRepository.js";
import { WarehouseRepository } from "./warehouse/WarehouseRepository.js";
import { TranslationRepository } from "./translation/TranslationRepository.js";
import { InventoryItemRepository } from "./inventory-item/InventoryItemRepository.js";
import { InventoryWidgetRepository } from "./inventory-widget/InventoryWidgetRepository.js";

export interface RepositoryConfig {
  db: Database;
}

// Re-export Database type for scripts that need to access it
export type { Database };

/**
 * Repository aggregator for inventory service.
 * Contains only inventory-related repositories:
 * - inventoryItem: InventoryItem management (1:1 with Variant)
 * - warehouse: Warehouse management
 * - stock: Stock levels and movements
 * - cost: Cost history
 * - physical: Dimensions and weight
 * - translation: Warehouse translations
 */
export class Repository {
  public readonly inventoryItem: InventoryItemRepository;
  public readonly inventoryWidget: InventoryWidgetRepository;
  public readonly cost: CostRepository;
  public readonly physical: PhysicalRepository;
  public readonly stock: StockRepository;
  public readonly warehouse: WarehouseRepository;
  public readonly translation: TranslationRepository;
  public readonly txManager: TransactionManager<Database>;

  /**
   * Get the current database connection (transaction-aware).
   * Use this for operations that need raw database access.
   */
  public get db(): Database {
    return this.txManager.getConnection() as Database;
  }

  private constructor(
    inventoryItem: InventoryItemRepository,
    inventoryWidget: InventoryWidgetRepository,
    cost: CostRepository,
    physical: PhysicalRepository,
    stock: StockRepository,
    warehouse: WarehouseRepository,
    translation: TranslationRepository,
    txManager: TransactionManager<Database>
  ) {
    this.inventoryItem = inventoryItem;
    this.inventoryWidget = inventoryWidget;
    this.cost = cost;
    this.physical = physical;
    this.stock = stock;
    this.warehouse = warehouse;
    this.translation = translation;
    this.txManager = txManager;
  }

  /**
   * Create Repository with database instance
   */
  static async create(config: RepositoryConfig): Promise<Repository> {
    const { db } = config;

    // Create transaction manager
    const txManager = new TransactionManager(db);

    // Create repositories
    const inventoryItem = new InventoryItemRepository(db, txManager);
    const inventoryWidget = new InventoryWidgetRepository(db, txManager);
    const cost = new CostRepository(db, txManager);
    const physical = new PhysicalRepository(db, txManager);
    const stock = new StockRepository(db, txManager);
    const warehouse = new WarehouseRepository(db, txManager);
    const translation = new TranslationRepository(db, txManager);

    return new Repository(
      inventoryItem,
      inventoryWidget,
      cost,
      physical,
      stock,
      warehouse,
      translation,
      txManager
    );
  }
}

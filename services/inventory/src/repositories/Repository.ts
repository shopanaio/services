import { TransactionManager } from "@shopana/shared-kernel";
import type { Database } from "../infrastructure/db/database";
import { ProductRepository } from "./product/ProductRepository.js";
import { VariantRepository } from "./variant/VariantRepository.js";
import { PricingRepository } from "./pricing/PricingRepository.js";
import { CostRepository } from "./cost/CostRepository.js";
import { OptionRepository } from "./option/OptionRepository.js";
import { FeatureRepository } from "./feature/FeatureRepository.js";
import { PhysicalRepository } from "./physical/PhysicalRepository.js";
import { StockRepository } from "./stock/StockRepository.js";
import { WarehouseRepository } from "./warehouse/WarehouseRepository.js";
import { TranslationRepository } from "./translation/TranslationRepository.js";
import { MediaRepository } from "./media/MediaRepository.js";
import { InventoryWidgetRepository } from "./inventory-widget/InventoryWidgetRepository.js";

export interface RepositoryConfig {
  db: Database;
}

/**
 * Repository aggregator for inventory service.
 */
export class Repository {
  public readonly product: ProductRepository;
  public readonly variant: VariantRepository;
  public readonly pricing: PricingRepository;
  public readonly cost: CostRepository;
  public readonly option: OptionRepository;
  public readonly feature: FeatureRepository;
  public readonly physical: PhysicalRepository;
  public readonly stock: StockRepository;
  public readonly warehouse: WarehouseRepository;
  public readonly translation: TranslationRepository;
  public readonly media: MediaRepository;
  public readonly inventoryWidget: InventoryWidgetRepository;
  public readonly txManager: TransactionManager<Database>;

  private constructor(
    product: ProductRepository,
    variant: VariantRepository,
    pricing: PricingRepository,
    cost: CostRepository,
    option: OptionRepository,
    feature: FeatureRepository,
    physical: PhysicalRepository,
    stock: StockRepository,
    warehouse: WarehouseRepository,
    translation: TranslationRepository,
    media: MediaRepository,
    inventoryWidget: InventoryWidgetRepository,
    txManager: TransactionManager<Database>
  ) {
    this.product = product;
    this.variant = variant;
    this.pricing = pricing;
    this.cost = cost;
    this.option = option;
    this.feature = feature;
    this.physical = physical;
    this.stock = stock;
    this.warehouse = warehouse;
    this.translation = translation;
    this.media = media;
    this.inventoryWidget = inventoryWidget;
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
    const product = new ProductRepository(db, txManager);
    const variant = new VariantRepository(db, txManager);
    const pricing = new PricingRepository(db, txManager);
    const cost = new CostRepository(db, txManager);
    const option = new OptionRepository(db, txManager);
    const feature = new FeatureRepository(db, txManager);
    const physical = new PhysicalRepository(db, txManager);
    const stock = new StockRepository(db, txManager);
    const warehouse = new WarehouseRepository(db, txManager);
    const translation = new TranslationRepository(db, txManager);
    const media = new MediaRepository(db, txManager);
    const inventoryWidget = new InventoryWidgetRepository(db, txManager);

    return new Repository(
      product,
      variant,
      pricing,
      cost,
      option,
      feature,
      physical,
      stock,
      warehouse,
      translation,
      media,
      inventoryWidget,
      txManager
    );
  }
}

import { TransactionManager } from "@shopana/shared-kernel";
import { initDatabase, closeDatabaseConnection, type Database } from "../infrastructure/db/database";
import { ProductRepository } from "./ProductRepository";
import { VariantRepository } from "./VariantRepository";
import { PricingRepository } from "./PricingRepository";
import { CostRepository } from "./CostRepository";
import { OptionRepository } from "./OptionRepository";
import { FeatureRepository } from "./FeatureRepository";
import { PhysicalRepository } from "./PhysicalRepository";
import { StockRepository } from "./StockRepository";
import { WarehouseRepository } from "./WarehouseRepository";
import { TranslationRepository } from "./TranslationRepository";
import { MediaRepository } from "./MediaRepository";
import { ProductQueryRepository } from "./ProductQueryRepository";
import { VariantQueryRepository } from "./VariantQueryRepository";
import { WarehouseQueryRepository } from "./WarehouseQueryRepository";
import { PricingQueryRepository } from "./PricingQueryRepository";
import {
  VariantLoaderQueryRepository,
  ProductLoaderQueryRepository,
  OptionLoaderQueryRepository,
  FeatureLoaderQueryRepository,
  WarehouseLoaderQueryRepository,
} from "./loaders/index.js";

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
  public readonly productQuery: ProductQueryRepository;
  public readonly variantQuery: VariantQueryRepository;
  public readonly warehouseQuery: WarehouseQueryRepository;
  public readonly pricingQuery: PricingQueryRepository;

  // Loader query repositories
  public readonly variantLoaderQuery: VariantLoaderQueryRepository;
  public readonly productLoaderQuery: ProductLoaderQueryRepository;
  public readonly optionLoaderQuery: OptionLoaderQueryRepository;
  public readonly featureLoaderQuery: FeatureLoaderQueryRepository;
  public readonly warehouseLoaderQuery: WarehouseLoaderQueryRepository;

  private readonly db: Database;

  /** Transaction Manager — used by Kernel to wrap scripts in transactions */
  public readonly txManager: TransactionManager<Database>;

  constructor(connectionString: string) {
    this.db = initDatabase(connectionString);
    this.txManager = new TransactionManager(this.db);

    this.product = new ProductRepository(this.db, this.txManager);
    this.variant = new VariantRepository(this.db, this.txManager);
    this.pricing = new PricingRepository(this.db, this.txManager);
    this.cost = new CostRepository(this.db, this.txManager);
    this.option = new OptionRepository(this.db, this.txManager);
    this.feature = new FeatureRepository(this.db, this.txManager);
    this.physical = new PhysicalRepository(this.db, this.txManager);
    this.stock = new StockRepository(this.db, this.txManager);
    this.warehouse = new WarehouseRepository(this.db, this.txManager);
    this.translation = new TranslationRepository(this.db, this.txManager);
    this.media = new MediaRepository(this.db, this.txManager);
    this.productQuery = new ProductQueryRepository(this.db, this.txManager);
    this.variantQuery = new VariantQueryRepository(this.db, this.txManager);
    this.warehouseQuery = new WarehouseQueryRepository(this.db, this.txManager);
    this.pricingQuery = new PricingQueryRepository(this.db, this.txManager);

    // Loader query repositories
    this.variantLoaderQuery = new VariantLoaderQueryRepository(this.db, this.txManager);
    this.productLoaderQuery = new ProductLoaderQueryRepository(this.db, this.txManager);
    this.optionLoaderQuery = new OptionLoaderQueryRepository(this.db, this.txManager);
    this.featureLoaderQuery = new FeatureLoaderQueryRepository(this.db, this.txManager);
    this.warehouseLoaderQuery = new WarehouseLoaderQueryRepository(this.db, this.txManager);
  }

  async close(): Promise<void> {
    await closeDatabaseConnection();
  }
}

import { TransactionManager } from "@shopana/shared-kernel";
import { initDatabase, closeDatabaseConnection, type Database } from "../infrastructure/db/database";
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
  }

  async close(): Promise<void> {
    await closeDatabaseConnection();
  }
}

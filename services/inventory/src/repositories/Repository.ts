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

  private readonly db: Database;

  constructor(connectionString: string) {
    this.db = initDatabase(connectionString);

    this.product = new ProductRepository(this.db);
    this.variant = new VariantRepository(this.db);
    this.pricing = new PricingRepository(this.db);
    this.cost = new CostRepository(this.db);
    this.option = new OptionRepository(this.db);
    this.feature = new FeatureRepository(this.db);
    this.physical = new PhysicalRepository(this.db);
    this.stock = new StockRepository(this.db);
    this.warehouse = new WarehouseRepository(this.db);
  }

  async close(): Promise<void> {
    await closeDatabaseConnection();
  }
}

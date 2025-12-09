import type { TransactionManager } from "@shopana/shared-kernel";
import type { Database } from "../../infrastructure/db/database.js";
import { VariantLoader, type VariantLoaders } from "./VariantLoader.js";
import { ProductLoader, type ProductDataLoaders } from "./ProductLoader.js";
import { OptionLoader, type OptionLoaders } from "./OptionLoader.js";
import { FeatureLoader, type FeatureLoaders } from "./FeatureLoader.js";
import { WarehouseLoader, type WarehouseLoaders } from "./WarehouseLoader.js";
import type { ProductLoaders } from "../../views/admin/context.js";

/**
 * Factory for creating all product-related DataLoaders.
 * Combines loaders from VariantLoader, ProductLoader, OptionLoader, FeatureLoader, and WarehouseLoader.
 */
export class ProductLoaderFactory {
  private readonly variantLoader: VariantLoader;
  private readonly productLoader: ProductLoader;
  private readonly optionLoader: OptionLoader;
  private readonly featureLoader: FeatureLoader;
  private readonly warehouseLoader: WarehouseLoader;

  constructor(
    private readonly db: Database,
    private readonly txManager: TransactionManager<Database>
  ) {
    this.variantLoader = new VariantLoader(db, txManager);
    this.productLoader = new ProductLoader(db, txManager);
    this.optionLoader = new OptionLoader(db, txManager);
    this.featureLoader = new FeatureLoader(db, txManager);
    this.warehouseLoader = new WarehouseLoader(db, txManager);
  }

  /**
   * Create all product-related DataLoaders combined
   */
  createLoaders(): ProductLoaders {
    const variantLoaders = this.variantLoader.createLoaders();
    const productLoaders = this.productLoader.createLoaders();
    const optionLoaders = this.optionLoader.createLoaders();
    const featureLoaders = this.featureLoader.createLoaders();
    const warehouseLoaders = this.warehouseLoader.createLoaders();

    return {
      ...variantLoaders,
      ...productLoaders,
      ...optionLoaders,
      ...featureLoaders,
      ...warehouseLoaders,
    };
  }

  /**
   * Create only variant-related loaders
   */
  createVariantLoaders(): VariantLoaders {
    return this.variantLoader.createLoaders();
  }

  /**
   * Create only product-related loaders
   */
  createProductLoaders(): ProductDataLoaders {
    return this.productLoader.createLoaders();
  }

  /**
   * Create only option-related loaders
   */
  createOptionLoaders(): OptionLoaders {
    return this.optionLoader.createLoaders();
  }

  /**
   * Create only feature-related loaders
   */
  createFeatureLoaders(): FeatureLoaders {
    return this.featureLoader.createLoaders();
  }

  /**
   * Create only warehouse-related loaders
   */
  createWarehouseLoaders(): WarehouseLoaders {
    return this.warehouseLoader.createLoaders();
  }
}

import { VariantLoader, type VariantLoaders } from "./VariantLoader.js";
import { ProductLoader, type ProductDataLoaders } from "./ProductLoader.js";
import { OptionLoader, type OptionLoaders } from "./OptionLoader.js";
import { FeatureLoader, type FeatureLoaders } from "./FeatureLoader.js";
import { WarehouseLoader, type WarehouseLoaders } from "./WarehouseLoader.js";
import type { Repository } from "../Repository.js";
import type { ProductLoaders } from "../../views/admin/context.js";

export class ProductLoaderFactory {
  private readonly variantLoader: VariantLoader;
  private readonly productLoader: ProductLoader;
  private readonly optionLoader: OptionLoader;
  private readonly featureLoader: FeatureLoader;
  private readonly warehouseLoader: WarehouseLoader;

  constructor(repository: Repository) {
    this.variantLoader = new VariantLoader(repository);
    this.productLoader = new ProductLoader(repository);
    this.optionLoader = new OptionLoader(repository);
    this.featureLoader = new FeatureLoader(repository);
    this.warehouseLoader = new WarehouseLoader(repository);
  }

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

  createVariantLoaders(): VariantLoaders {
    return this.variantLoader.createLoaders();
  }

  createProductLoaders(): ProductDataLoaders {
    return this.productLoader.createLoaders();
  }

  createOptionLoaders(): OptionLoaders {
    return this.optionLoader.createLoaders();
  }

  createFeatureLoaders(): FeatureLoaders {
    return this.featureLoader.createLoaders();
  }

  createWarehouseLoaders(): WarehouseLoaders {
    return this.warehouseLoader.createLoaders();
  }
}

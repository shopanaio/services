import { VariantLoader, type VariantLoaders } from "./VariantLoader.js";
import { ProductLoader, type ProductDataLoaders } from "./ProductLoader.js";
import { OptionLoader, type OptionLoaders } from "./OptionLoader.js";
import { FeatureLoader, type FeatureLoaders } from "./FeatureLoader.js";
import { WarehouseLoader, type WarehouseLoaders } from "./WarehouseLoader.js";
import type { VariantLoaderQueryRepository } from "./VariantLoaderQueryRepository.js";
import type { ProductLoaderQueryRepository } from "./ProductLoaderQueryRepository.js";
import type { OptionLoaderQueryRepository } from "./OptionLoaderQueryRepository.js";
import type { FeatureLoaderQueryRepository } from "./FeatureLoaderQueryRepository.js";
import type { WarehouseLoaderQueryRepository } from "./WarehouseLoaderQueryRepository.js";
import type { ProductLoaders } from "../../views/admin/context.js";

export interface LoaderQueryRepositories {
  variant: VariantLoaderQueryRepository;
  product: ProductLoaderQueryRepository;
  option: OptionLoaderQueryRepository;
  feature: FeatureLoaderQueryRepository;
  warehouse: WarehouseLoaderQueryRepository;
}

export class ProductLoaderFactory {
  private readonly variantLoader: VariantLoader;
  private readonly productLoader: ProductLoader;
  private readonly optionLoader: OptionLoader;
  private readonly featureLoader: FeatureLoader;
  private readonly warehouseLoader: WarehouseLoader;

  constructor(repos: LoaderQueryRepositories) {
    this.variantLoader = new VariantLoader(repos.variant);
    this.productLoader = new ProductLoader(repos.product);
    this.optionLoader = new OptionLoader(repos.option);
    this.featureLoader = new FeatureLoader(repos.feature);
    this.warehouseLoader = new WarehouseLoader(repos.warehouse);
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

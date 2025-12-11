import DataLoader from "dataloader";
import type { Repository } from "../repositories/Repository.js";
import { FeatureLoader } from "./FeatureLoader.js";
import { OptionLoader } from "./OptionLoader.js";
import { ProductLoader } from "./ProductLoader.js";
import { VariantLoader } from "./VariantLoader.js";
import { WarehouseLoader } from "./WarehouseLoader.js";

export class Loader {
  // Product
  public readonly product;
  public readonly productTranslation;
  public readonly productOptionIds;
  public readonly productFeatureIds;
  public readonly productOption;
  public readonly productFeature;

  // Variant
  public readonly variant;
  public readonly variantIds;
  public readonly variantTranslation;
  public readonly variantPricing;
  public readonly variantPriceById;
  public readonly variantPriceIds;
  public readonly variantDimensions;
  public readonly variantWeight;
  public readonly variantMedia;
  public readonly variantStock;
  public readonly variantSelectedOptions;

  // Options
  public readonly optionTranslation;
  public readonly optionValueIds;
  public readonly optionValue;
  public readonly optionValueTranslation;

  // Features
  public readonly featureTranslation;
  public readonly featureValueIds;
  public readonly featureValue;
  public readonly featureValueTranslation;

  // Warehouse
  public readonly warehouse;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: DataLoader<any, any>;

  constructor(repository: Repository) {
    const productLoader = new ProductLoader(repository);
    const variantLoader = new VariantLoader(repository);
    const optionLoader = new OptionLoader(repository);
    const featureLoader = new FeatureLoader(repository);
    const warehouseLoader = new WarehouseLoader(repository);

    // Product
    this.product = productLoader.product;
    this.productTranslation = productLoader.productTranslation;
    this.productOptionIds = productLoader.productOptionIds;
    this.productFeatureIds = productLoader.productFeatureIds;
    this.productOption = productLoader.productOption;
    this.productFeature = productLoader.productFeature;

    // Variant
    this.variant = variantLoader.variant;
    this.variantIds = variantLoader.variantIds;
    this.variantTranslation = variantLoader.variantTranslation;
    this.variantPricing = variantLoader.variantPricing;
    this.variantPriceById = variantLoader.variantPriceById;
    this.variantPriceIds = variantLoader.variantPriceIds;
    this.variantDimensions = variantLoader.variantDimensions;
    this.variantWeight = variantLoader.variantWeight;
    this.variantMedia = variantLoader.variantMedia;
    this.variantStock = variantLoader.variantStock;
    this.variantSelectedOptions = variantLoader.variantSelectedOptions;

    // Options
    this.optionTranslation = optionLoader.optionTranslation;
    this.optionValueIds = optionLoader.optionValueIds;
    this.optionValue = optionLoader.optionValue;
    this.optionValueTranslation = optionLoader.optionValueTranslation;

    // Features
    this.featureTranslation = featureLoader.featureTranslation;
    this.featureValueIds = featureLoader.featureValueIds;
    this.featureValue = featureLoader.featureValue;
    this.featureValueTranslation = featureLoader.featureValueTranslation;

    // Warehouse
    this.warehouse = warehouseLoader.warehouse;
  }
}

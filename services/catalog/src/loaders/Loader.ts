import DataLoader from "dataloader";
import type { Repository } from "../repositories/Repository.js";
import { CategoryLoader } from "./CategoryLoader.js";
import { FeatureLoader } from "./FeatureLoader.js";
import { OptionLoader } from "./OptionLoader.js";
import { ProductLoader } from "./ProductLoader.js";
import { TagLoader } from "./TagLoader.js";
import { VariantLoader } from "./VariantLoader.js";

export class Loader {
  // Product
  public readonly product;
  public readonly productTranslation;
  public readonly productSeo;
  public readonly productOptionIds;
  public readonly productFeatureIds;
  public readonly productRootFeatureIds;
  public readonly productOption;
  public readonly productFeature;

  // Variant (без inventory полей - они в Inventory Service)
  public readonly variant;
  public readonly variantIds;
  public readonly variantTranslation;
  public readonly variantPricing;
  public readonly variantPriceById;
  public readonly variantPriceIds;
  public readonly variantMedia;
  public readonly variantSelectedOptions;

  // Category
  public readonly category;
  public readonly categoryTranslation;
  public readonly categoryMedia;
  public readonly categoryChildrenIds;
  public readonly categoryAncestorIds;
  public readonly categoryProductsCount;
  public readonly productCategoryIds;

  // Tag
  public readonly tag;
  public readonly tagTranslation;
  public readonly tagProductsCount;
  public readonly productTagIds;

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
  public readonly featureChildIds;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: DataLoader<any, any>;

  constructor(repository: Repository) {
    const productLoader = new ProductLoader(repository);
    const variantLoader = new VariantLoader(repository);
    const categoryLoader = new CategoryLoader(repository);
    const tagLoader = new TagLoader(repository);
    const optionLoader = new OptionLoader(repository);
    const featureLoader = new FeatureLoader(repository);

    // Product
    this.product = productLoader.product;
    this.productTranslation = productLoader.productTranslation;
    this.productSeo = productLoader.productSeo;
    this.productOptionIds = productLoader.productOptionIds;
    this.productFeatureIds = productLoader.productFeatureIds;
    this.productRootFeatureIds = productLoader.productRootFeatureIds;
    this.productOption = productLoader.productOption;
    this.productFeature = productLoader.productFeature;

    // Variant (без inventory полей)
    this.variant = variantLoader.variant;
    this.variantIds = variantLoader.variantIds;
    this.variantTranslation = variantLoader.variantTranslation;
    this.variantPricing = variantLoader.variantPricing;
    this.variantPriceById = variantLoader.variantPriceById;
    this.variantPriceIds = variantLoader.variantPriceIds;
    this.variantMedia = variantLoader.variantMedia;
    this.variantSelectedOptions = variantLoader.variantSelectedOptions;

    // Category
    this.category = categoryLoader.category;
    this.categoryTranslation = categoryLoader.categoryTranslation;
    this.categoryMedia = categoryLoader.categoryMedia;
    this.categoryChildrenIds = categoryLoader.categoryChildrenIds;
    this.categoryAncestorIds = categoryLoader.categoryAncestorIds;
    this.categoryProductsCount = categoryLoader.categoryProductsCount;
    this.productCategoryIds = categoryLoader.productCategoryIds;

    // Tag
    this.tag = tagLoader.tag;
    this.tagTranslation = tagLoader.tagTranslation;
    this.tagProductsCount = tagLoader.tagProductsCount;
    this.productTagIds = tagLoader.productTagIds;

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
    this.featureChildIds = featureLoader.featureChildIds;
  }
}

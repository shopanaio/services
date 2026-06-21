import DataLoader from "dataloader";
import type { Repository } from "../repositories/Repository.js";
import { CategoryLoader } from "./CategoryLoader.js";
import { FeatureLoader } from "./FeatureLoader.js";
import { OptionLoader } from "./OptionLoader.js";
import { ProductLoader } from "./ProductLoader.js";
import { TagLoader } from "./TagLoader.js";
import { VariantLoader } from "./VariantLoader.js";
import { FacetGroupLoader } from "./FacetGroupLoader.js";
import { FacetLoader } from "./FacetLoader.js";
import { FacetValueLoader } from "./FacetValueLoader.js";
import { FacetSwatchLoader } from "./FacetSwatchLoader.js";
import { CollectionLoader } from "./CollectionLoader.js";
import { BundleLoader } from "./BundleLoader.js";
import { BulkEditLoader } from "./BulkEditLoader.js";

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
  public readonly productMedia;

  // Variant (without inventory fields - they live in Inventory Service)
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
  public readonly categorySeo;
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
  public readonly swatch;

  // Features
  public readonly featureTranslation;
  public readonly featureValueIds;
  public readonly featureValue;
  public readonly featureValueTranslation;
  public readonly featureChildIds;

  // Facets
  public readonly facetGroup;
  public readonly facetGroupTranslation;
  public readonly facetIdsByGroup;
  public readonly facet;
  public readonly facetTranslation;
  public readonly facetValueIds;
  public readonly facetValue;
  public readonly facetValueTranslation;
  public readonly facetValueSourceHandles;
  public readonly facetSwatch;

  // Collections
  public readonly collection;
  public readonly collectionTranslation;
  public readonly collectionSeo;
  public readonly collectionMedia;

  // Bundles
  public readonly bundleGroup;
  public readonly bundleGroupsByProductId;
  public readonly bundleItem;
  public readonly bundleItemsByGroupId;
  public readonly bundlePricingTemplate;
  public readonly bundlePricingTemplatesByProductId;
  public readonly dependencyRule;
  public readonly dependencyRulesByProductId;
  public readonly conditionGroup;
  public readonly conditionGroupsByRuleId;
  public readonly condition;
  public readonly conditionsByGroupId;
  public readonly dependencyAction;
  public readonly dependencyActionsByRuleId;

  // Bulk edit
  public readonly bulkEditJob;
  public readonly bulkEditItem;
  public readonly bulkEditJobProgress;
  public readonly bulkEditJobTotalProducts;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: DataLoader<any, any>;

  constructor(repository: Repository) {
    const productLoader = new ProductLoader(repository);
    const variantLoader = new VariantLoader(repository);
    const categoryLoader = new CategoryLoader(repository);
    const tagLoader = new TagLoader(repository);
    const optionLoader = new OptionLoader(repository);
    const featureLoader = new FeatureLoader(repository);
    const facetGroupLoader = new FacetGroupLoader(repository);
    const facetLoader = new FacetLoader(repository);
    const facetValueLoader = new FacetValueLoader(repository);
    const facetSwatchLoader = new FacetSwatchLoader(repository);
    const collectionLoader = new CollectionLoader(repository);
    const bundleLoader = new BundleLoader(repository);
    const bulkEditLoader = new BulkEditLoader(repository);

    // Product
    this.product = productLoader.product;
    this.productTranslation = productLoader.productTranslation;
    this.productSeo = productLoader.productSeo;
    this.productOptionIds = productLoader.productOptionIds;
    this.productFeatureIds = productLoader.productFeatureIds;
    this.productRootFeatureIds = productLoader.productRootFeatureIds;
    this.productOption = productLoader.productOption;
    this.productFeature = productLoader.productFeature;
    this.productMedia = productLoader.productMedia;

    // Variant (without inventory fields)
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
    this.categorySeo = categoryLoader.categorySeo;
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
    this.swatch = optionLoader.swatch;

    // Features
    this.featureTranslation = featureLoader.featureTranslation;
    this.featureValueIds = featureLoader.featureValueIds;
    this.featureValue = featureLoader.featureValue;
    this.featureValueTranslation = featureLoader.featureValueTranslation;
    this.featureChildIds = featureLoader.featureChildIds;

    // Facets
    this.facetGroup = facetGroupLoader.facetGroup;
    this.facetGroupTranslation = facetGroupLoader.facetGroupTranslation;
    this.facetIdsByGroup = facetGroupLoader.facetIdsByGroup;
    this.facet = facetLoader.facet;
    this.facetTranslation = facetLoader.facetTranslation;
    this.facetValueIds = facetLoader.facetValueIds;
    this.facetValue = facetValueLoader.facetValue;
    this.facetValueTranslation = facetValueLoader.facetValueTranslation;
    this.facetValueSourceHandles = facetValueLoader.facetValueSourceHandles;
    this.facetSwatch = facetSwatchLoader.facetSwatch;

    // Collections
    this.collection = collectionLoader.collection;
    this.collectionTranslation = collectionLoader.collectionTranslation;
    this.collectionSeo = collectionLoader.collectionSeo;
    this.collectionMedia = collectionLoader.collectionMedia;

    // Bundles
    this.bundleGroup = bundleLoader.bundleGroup;
    this.bundleGroupsByProductId = bundleLoader.bundleGroupsByProductId;
    this.bundleItem = bundleLoader.bundleItem;
    this.bundleItemsByGroupId = bundleLoader.bundleItemsByGroupId;
    this.bundlePricingTemplate = bundleLoader.bundlePricingTemplate;
    this.bundlePricingTemplatesByProductId = bundleLoader.bundlePricingTemplatesByProductId;
    this.dependencyRule = bundleLoader.dependencyRule;
    this.dependencyRulesByProductId = bundleLoader.dependencyRulesByProductId;
    this.conditionGroup = bundleLoader.conditionGroup;
    this.conditionGroupsByRuleId = bundleLoader.conditionGroupsByRuleId;
    this.condition = bundleLoader.condition;
    this.conditionsByGroupId = bundleLoader.conditionsByGroupId;
    this.dependencyAction = bundleLoader.dependencyAction;
    this.dependencyActionsByRuleId = bundleLoader.dependencyActionsByRuleId;

    // Bulk edit
    this.bulkEditJob = bulkEditLoader.bulkEditJob;
    this.bulkEditItem = bulkEditLoader.bulkEditItem;
    this.bulkEditJobProgress = bulkEditLoader.bulkEditJobProgress;
    this.bulkEditJobTotalProducts = bulkEditLoader.bulkEditJobTotalProducts;
  }
}

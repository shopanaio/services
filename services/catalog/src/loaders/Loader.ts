import DataLoader from "dataloader";
import type { Repository } from "../repositories/Repository.js";
import { CategoryLoader } from "./CategoryLoader.js";
import { FeatureLoader } from "./FeatureLoader.js";
import { OptionLoader } from "./OptionLoader.js";
import { OptionCategoryLoader } from "./OptionCategoryLoader.js";
import { ProductLoader } from "./ProductLoader.js";
import { VendorLoader } from "./VendorLoader.js";
import { TagLoader } from "./TagLoader.js";
import { VariantLoader } from "./VariantLoader.js";
import { CollectionLoader } from "./CollectionLoader.js";
import { BulkEditLoader } from "./BulkEditLoader.js";
import { WarehouseLoader } from "./WarehouseLoader.js";
import { InventoryItemLoader } from "./InventoryItemLoader.js";
import { StockLoader } from "./StockLoader.js";
import { ComponentLoader } from "./ComponentLoader.js";
import { ComparisonLoader } from "./ComparisonLoader.js";

export class Loader {
  // Product
  public readonly product;
  public readonly productReference;
  public readonly productTranslation;
  public readonly productTranslations;
  public readonly productSeo;
  public readonly productSeos;
  public readonly productOptionIds;
  public readonly productFeatureIds;
  public readonly productRootFeatureIds;
  public readonly productOption;
  public readonly productFeature;
  public readonly productMedia;
  public readonly productPriceRange;

  // Vendor
  public readonly vendor;

  // Variant (without inventory fields - they live in Inventory Service)
  public readonly variant;
  public readonly variantIds;
  public readonly variantTranslation;
  public readonly variantTranslations;
  public readonly variantPricing;
  public readonly variantPriceById;
  public readonly variantPriceIds;
  public readonly variantMedia;
  public readonly variantSelectedOptions;

  // Category
  public readonly category;
  public readonly categoryTranslation;
  public readonly categoryTranslations;
  public readonly categoryMedia;
  public readonly categorySeo;
  public readonly categoryChildrenIds;
  public readonly categoryAncestorIds;
  public readonly categoryProductsCount;
  public readonly productCategoryIds;
  public readonly productCategoryLinksByProductId;

  // Tag
  public readonly tag;
  public readonly tagTranslation;
  public readonly tagProductsCount;
  public readonly productTagIds;

  // Options
  public readonly optionCategory;
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

  // Collections
  public readonly collection;
  public readonly collectionTranslation;
  public readonly collectionSeo;
  public readonly collectionMedia;

  // Bulk edit
  public readonly bulkEditJob;
  public readonly bulkEditItem;
  public readonly bulkEditJobProgress;
  public readonly bulkEditJobTotalProducts;

  // Warehouse
  public readonly warehouse;

  // InventoryItem
  public readonly inventoryItem;
  public readonly inventoryItemByVariant;

  // Stock
  public readonly stockByVariant;

  // Product components
  public readonly component;
  public readonly componentByProductId;
  public readonly componentConfiguration;
  public readonly componentConfigurationIdsByComponentId;
  public readonly componentConfigurationVariantIds;
  public readonly componentConfigurationIdByVariantId;
  public readonly componentGroup;
  public readonly componentGroupIdsByConfigurationId;
  public readonly componentGroupTranslation;
  public readonly componentItem;
  public readonly componentItemIdsByGroupId;
  public readonly componentItemTranslation;
  public readonly componentOptionSelection;
  public readonly componentOptionSelectionIdsByItemId;
  public readonly componentOptionValueSelection;
  public readonly componentOptionValueSelectionIdsBySelectionId;
  public readonly componentPriceRule;
  public readonly componentPriceRuleAmounts;
  public readonly componentPriceRulePercent;
  public readonly componentPricingTemplate;
  public readonly componentPricingTemplateIdsByConfigurationId;
  public readonly componentDependencyRule;
  public readonly componentDependencyRuleIdsByConfigurationId;
  public readonly componentConditionGroup;
  public readonly componentConditionGroupIdsByRuleId;
  public readonly componentCondition;
  public readonly componentConditionIdsByGroupId;
  public readonly componentDependencyAction;
  public readonly componentDependencyActionIdsByRuleId;

  // Product comparison
  public readonly comparisonProfile;
  public readonly localizedComparisonProfile;
  public readonly comparisonGroupsByProfile;
  public readonly comparisonFieldsByProfile;
  public readonly comparisonOptionsByField;
  public readonly directComparisonProfileByCategory;
  public readonly effectiveComparisonProfileByCategory;
  public readonly effectiveComparisonProfileByProduct;
  public readonly comparisonConfigurationByProduct;
  public readonly comparisonGroup;
  public readonly comparisonField;
  public readonly comparisonFieldOption;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: DataLoader<any, any>;

  constructor(repository: Repository) {
    const productLoader = new ProductLoader(repository);
    const vendorLoader = new VendorLoader(repository);
    const variantLoader = new VariantLoader(repository);
    const categoryLoader = new CategoryLoader(repository);
    const tagLoader = new TagLoader(repository);
    const optionLoader = new OptionLoader(repository);
    const optionCategoryLoader = new OptionCategoryLoader(repository);
    const featureLoader = new FeatureLoader(repository);
    const collectionLoader = new CollectionLoader(repository);
    const bulkEditLoader = new BulkEditLoader(repository);
    const warehouseLoader = new WarehouseLoader(repository);
    const inventoryItemLoader = new InventoryItemLoader(repository);
    const stockLoader = new StockLoader(repository);
    const componentLoader = new ComponentLoader(repository);
    const comparisonLoader = new ComparisonLoader(repository);

    // Product
    this.product = productLoader.product;
    this.productReference = productLoader.productReference;
    this.productTranslation = productLoader.productTranslation;
    this.productTranslations = productLoader.productTranslations;
    this.productSeo = productLoader.productSeo;
    this.productSeos = productLoader.productSeos;
    this.productOptionIds = productLoader.productOptionIds;
    this.productFeatureIds = productLoader.productFeatureIds;
    this.productRootFeatureIds = productLoader.productRootFeatureIds;
    this.productOption = productLoader.productOption;
    this.productFeature = productLoader.productFeature;
    this.productMedia = productLoader.productMedia;
    this.productPriceRange = productLoader.productPriceRange;

    // Vendor
    this.vendor = vendorLoader.vendor;

    // Variant (without inventory fields)
    this.variant = variantLoader.variant;
    this.variantIds = variantLoader.variantIds;
    this.variantTranslation = variantLoader.variantTranslation;
    this.variantTranslations = variantLoader.variantTranslations;
    this.variantPricing = variantLoader.variantPricing;
    this.variantPriceById = variantLoader.variantPriceById;
    this.variantPriceIds = variantLoader.variantPriceIds;
    this.variantMedia = variantLoader.variantMedia;
    this.variantSelectedOptions = variantLoader.variantSelectedOptions;

    // Category
    this.category = categoryLoader.category;
    this.categoryTranslation = categoryLoader.categoryTranslation;
    this.categoryTranslations = categoryLoader.categoryTranslations;
    this.categoryMedia = categoryLoader.categoryMedia;
    this.categorySeo = categoryLoader.categorySeo;
    this.categoryChildrenIds = categoryLoader.categoryChildrenIds;
    this.categoryAncestorIds = categoryLoader.categoryAncestorIds;
    this.categoryProductsCount = categoryLoader.categoryProductsCount;
    this.productCategoryIds = categoryLoader.productCategoryIds;
    this.productCategoryLinksByProductId = categoryLoader.productCategoryLinksByProductId;

    // Tag
    this.tag = tagLoader.tag;
    this.tagTranslation = tagLoader.tagTranslation;
    this.tagProductsCount = tagLoader.tagProductsCount;
    this.productTagIds = tagLoader.productTagIds;

    // Options
    this.optionCategory = optionCategoryLoader.optionCategory;
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

    // Collections
    this.collection = collectionLoader.collection;
    this.collectionTranslation = collectionLoader.collectionTranslation;
    this.collectionSeo = collectionLoader.collectionSeo;
    this.collectionMedia = collectionLoader.collectionMedia;

    // Bulk edit
    this.bulkEditJob = bulkEditLoader.bulkEditJob;
    this.bulkEditItem = bulkEditLoader.bulkEditItem;
    this.bulkEditJobProgress = bulkEditLoader.bulkEditJobProgress;
    this.bulkEditJobTotalProducts = bulkEditLoader.bulkEditJobTotalProducts;

    // Warehouse
    this.warehouse = warehouseLoader.warehouse;

    // InventoryItem
    this.inventoryItem = inventoryItemLoader.inventoryItem;
    this.inventoryItemByVariant = inventoryItemLoader.inventoryItemByVariant;

    // Stock
    this.stockByVariant = stockLoader.stockByVariant;

    // Product components
    this.component = componentLoader.component;
    this.componentByProductId = componentLoader.componentByProductId;
    this.componentConfiguration = componentLoader.configuration;
    this.componentConfigurationIdsByComponentId = componentLoader.configurationIdsByComponentId;
    this.componentConfigurationVariantIds = componentLoader.configurationVariantIds;
    this.componentConfigurationIdByVariantId = componentLoader.configurationIdByVariantId;
    this.componentGroup = componentLoader.group;
    this.componentGroupIdsByConfigurationId = componentLoader.groupIdsByConfigurationId;
    this.componentGroupTranslation = componentLoader.groupTranslation;
    this.componentItem = componentLoader.item;
    this.componentItemIdsByGroupId = componentLoader.itemIdsByGroupId;
    this.componentItemTranslation = componentLoader.itemTranslation;
    this.componentOptionSelection = componentLoader.optionSelection;
    this.componentOptionSelectionIdsByItemId = componentLoader.optionSelectionIdsByItemId;
    this.componentOptionValueSelection = componentLoader.optionValueSelection;
    this.componentOptionValueSelectionIdsBySelectionId =
      componentLoader.optionValueSelectionIdsBySelectionId;
    this.componentPriceRule = componentLoader.priceRule;
    this.componentPriceRuleAmounts = componentLoader.priceRuleAmounts;
    this.componentPriceRulePercent = componentLoader.priceRulePercent;
    this.componentPricingTemplate = componentLoader.pricingTemplate;
    this.componentPricingTemplateIdsByConfigurationId =
      componentLoader.pricingTemplateIdsByConfigurationId;
    this.componentDependencyRule = componentLoader.dependencyRule;
    this.componentDependencyRuleIdsByConfigurationId =
      componentLoader.dependencyRuleIdsByConfigurationId;
    this.componentConditionGroup = componentLoader.conditionGroup;
    this.componentConditionGroupIdsByRuleId = componentLoader.conditionGroupIdsByRuleId;
    this.componentCondition = componentLoader.condition;
    this.componentConditionIdsByGroupId = componentLoader.conditionIdsByGroupId;
    this.componentDependencyAction = componentLoader.dependencyAction;
    this.componentDependencyActionIdsByRuleId = componentLoader.dependencyActionIdsByRuleId;

    this.comparisonProfile = comparisonLoader.profile;
    this.localizedComparisonProfile = comparisonLoader.localizedProfile;
    this.comparisonGroupsByProfile = comparisonLoader.groupsByProfile;
    this.comparisonFieldsByProfile = comparisonLoader.fieldsByProfile;
    this.comparisonOptionsByField = comparisonLoader.optionsByField;
    this.directComparisonProfileByCategory = comparisonLoader.directProfileByCategory;
    this.effectiveComparisonProfileByCategory = comparisonLoader.effectiveProfileByCategory;
    this.effectiveComparisonProfileByProduct = comparisonLoader.effectiveProfileByProduct;
    this.comparisonConfigurationByProduct = comparisonLoader.configurationByProduct;
    this.comparisonGroup = comparisonLoader.group;
    this.comparisonField = comparisonLoader.field;
    this.comparisonFieldOption = comparisonLoader.fieldOption;
  }
}

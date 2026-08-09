import type { ServiceContext } from "../../context/types.js";
import type { ProductSeo } from "../../repositories/models/index.js";
import type { ProductConnectionInput } from "../../repositories/product/ProductRepository.js";
import type { CategoryConnectionInput } from "../../repositories/category/CategoryRepository.js";
import type { VendorRelayInput } from "../../repositories/vendor/VendorRepository.js";
import type { OptionCategoryRelayInput } from "../../repositories/option-category/OptionCategoryRepository.js";
import type { TagRelayInput } from "../../repositories/tag/TagRepository.js";
import type { BulkEditJobConnectionInput } from "../../repositories/BulkEditJobRepository.js";
import type { WarehouseRelayInput } from "../../repositories/warehouse/WarehouseRepository.js";
import type { InventoryItemConnectionInput } from "../../repositories/inventory-item/InventoryItemRepository.js";
import type { CategoryProductConnectionInput } from "./CategoryProductConnectionResolver.js";
import type { StockRelayInput } from "../../repositories/stock/StockRepository.js";
import type { PricingWidgetInput } from "./PricingWidgetResolver.js";
import type { SeoShape } from "./SeoResolver.js";
import type {
  VariantConnectionInput,
  WarehouseAssignableVariantConnectionInput,
} from "./VariantConnectionResolver.js";

const registries = new WeakMap<ServiceContext, ResolverRegistry>();

export function getResolverRegistry(ctx: ServiceContext): ResolverRegistry {
  const existing = registries.get(ctx);
  if (existing) return existing;

  const registry = new ResolverRegistry(ctx);
  registries.set(ctx, registry);
  return registry;
}

export class ResolverRegistry {
  constructor(private readonly ctx: ServiceContext) {}

  async product(id: string) {
    const { ProductResolver } = await import("./ProductResolver.js");
    return new ProductResolver(id, this.ctx);
  }

  async productConnection(input: ProductConnectionInput) {
    const { ProductConnectionResolver } = await import(
      "./ProductConnectionResolver.js"
    );
    return new ProductConnectionResolver(input, this.ctx);
  }

  async productSeo(input: ProductSeo) {
    const { ProductSeoResolver } = await import("./ProductSeoResolver.js");
    return new ProductSeoResolver(input, this.ctx);
  }

  async productComponent(id: string) {
    const { ProductComponentResolver } = await import(
      "./ProductComponentResolver.js"
    );
    return new ProductComponentResolver(id, this.ctx);
  }

  async productComponentConfiguration(id: string) {
    const { ProductComponentConfigurationResolver } = await import(
      "./ProductComponentConfigurationResolver.js"
    );
    return new ProductComponentConfigurationResolver(id, this.ctx);
  }

  async productComponentGroup(id: string) {
    const { ProductComponentGroupResolver } = await import(
      "./ProductComponentGroupResolver.js"
    );
    return new ProductComponentGroupResolver(id, this.ctx);
  }

  async productComponentItem(id: string) {
    const { ProductComponentItemResolver } = await import(
      "./ProductComponentItemResolver.js"
    );
    return new ProductComponentItemResolver(id, this.ctx);
  }

  async productComponentItemOptionSelection(id: string) {
    const { ProductComponentItemOptionSelectionResolver } = await import(
      "./ProductComponentOptionResolver.js"
    );
    return new ProductComponentItemOptionSelectionResolver(id, this.ctx);
  }

  async productComponentItemOptionValueSelection(id: string) {
    const { ProductComponentItemOptionValueSelectionResolver } = await import(
      "./ProductComponentOptionResolver.js"
    );
    return new ProductComponentItemOptionValueSelectionResolver(id, this.ctx);
  }

  async productComponentPricingTemplate(id: string) {
    const { ProductComponentPricingTemplateResolver } = await import(
      "./ProductComponentPriceRuleResolver.js"
    );
    return new ProductComponentPricingTemplateResolver(id, this.ctx);
  }

  async productComponentPriceRule(id: string) {
    const { createProductComponentPriceRuleResolver } = await import(
      "./ProductComponentPriceRuleResolver.js"
    );
    return createProductComponentPriceRuleResolver(id, this.ctx);
  }

  async productComponentDependencyRule(id: string) {
    const { ProductComponentDependencyRuleResolver } = await import(
      "./ProductComponentDependencyRuleResolver.js"
    );
    return new ProductComponentDependencyRuleResolver(id, this.ctx);
  }

  async productComponentConditionGroup(id: string) {
    const { ProductComponentConditionGroupResolver } = await import(
      "./ProductComponentDependencyRuleResolver.js"
    );
    return new ProductComponentConditionGroupResolver(id, this.ctx);
  }

  async productComponentCondition(id: string) {
    const { ProductComponentConditionResolver } = await import(
      "./ProductComponentDependencyRuleResolver.js"
    );
    return new ProductComponentConditionResolver(id, this.ctx);
  }

  async productComponentDependencyAction(id: string) {
    const { ProductComponentDependencyActionResolver } = await import(
      "./ProductComponentDependencyRuleResolver.js"
    );
    return new ProductComponentDependencyActionResolver(id, this.ctx);
  }

  async category(id: string) {
    const { CategoryResolver } = await import("./CategoryResolver.js");
    return new CategoryResolver(id, this.ctx);
  }

  async categoryConnection(input: CategoryConnectionInput) {
    const { CategoryConnectionResolver } = await import(
      "./CategoryConnectionResolver.js"
    );
    return new CategoryConnectionResolver(input, this.ctx);
  }

  async categoryProductConnection(input: CategoryProductConnectionInput) {
    const { CategoryProductConnectionResolver } = await import(
      "./CategoryProductConnectionResolver.js"
    );
    return new CategoryProductConnectionResolver(input, this.ctx);
  }

  async variant(id: string) {
    const { VariantResolver } = await import("./VariantResolver.js");
    return new VariantResolver(id, this.ctx);
  }

  async variantPrice(id: string) {
    const { VariantPriceResolver } = await import("./VariantPriceResolver.js");
    return new VariantPriceResolver(id, this.ctx);
  }

  async variantConnection(input: VariantConnectionInput) {
    const { VariantConnectionResolver } = await import(
      "./VariantConnectionResolver.js"
    );
    return new VariantConnectionResolver(input, this.ctx);
  }

  async warehouseAssignableVariantConnection(
    input: WarehouseAssignableVariantConnectionInput
  ) {
    const { WarehouseAssignableVariantConnectionResolver } = await import(
      "./VariantConnectionResolver.js"
    );
    return new WarehouseAssignableVariantConnectionResolver(input, this.ctx);
  }

  async inventoryItem(id: string) {
    const { InventoryItemResolver } = await import("./InventoryItemResolver.js");
    return new InventoryItemResolver(id, this.ctx);
  }

  async inventoryItemConnection(input: InventoryItemConnectionInput) {
    const { InventoryItemConnectionResolver } = await import(
      "./InventoryItemConnectionResolver.js"
    );
    return new InventoryItemConnectionResolver(input, this.ctx);
  }

  async warehouse(id: string) {
    const { WarehouseResolver } = await import("./WarehouseResolver.js");
    return new WarehouseResolver(id, this.ctx);
  }

  async warehouseConnection(input: WarehouseRelayInput) {
    const { WarehouseConnectionResolver } = await import(
      "./WarehouseConnectionResolver.js"
    );
    return new WarehouseConnectionResolver(input, this.ctx);
  }

  async stock(id: string) {
    const { StockResolver } = await import("./StockResolver.js");
    return new StockResolver(id, this.ctx);
  }

  async stockConnection(input: StockRelayInput) {
    const { StockConnectionResolver } = await import(
      "./StockConnectionResolver.js"
    );
    return new StockConnectionResolver(input, this.ctx);
  }

  async vendor(id: string) {
    const { VendorResolver } = await import("./VendorResolver.js");
    return new VendorResolver(id, this.ctx);
  }

  async vendorConnection(input: VendorRelayInput) {
    const { VendorConnectionResolver } = await import(
      "./VendorConnectionResolver.js"
    );
    return new VendorConnectionResolver(input, this.ctx);
  }

  async collection(id: string) {
    const { CollectionResolver } = await import("./CollectionResolver.js");
    return new CollectionResolver(id, this.ctx);
  }

  async tag(id: string) {
    const { TagResolver } = await import("./TagResolver.js");
    return new TagResolver(id, this.ctx);
  }

  async tagConnection(input: TagRelayInput) {
    const { TagConnectionResolver } = await import(
      "./TagConnectionResolver.js"
    );
    return new TagConnectionResolver(input, this.ctx);
  }

  async option(id: string) {
    const { OptionResolver } = await import("./OptionResolver.js");
    return new OptionResolver(id, this.ctx);
  }

  async optionCategory(id: string) {
    const { OptionCategoryResolver } = await import(
      "./OptionCategoryResolver.js"
    );
    return new OptionCategoryResolver(id, this.ctx);
  }

  async optionCategoryConnection(input: OptionCategoryRelayInput) {
    const { OptionCategoryConnectionResolver } = await import(
      "./OptionCategoryConnectionResolver.js"
    );
    return new OptionCategoryConnectionResolver(input, this.ctx);
  }

  async optionValue(id: string) {
    const { OptionValueResolver } = await import("./OptionValueResolver.js");
    return new OptionValueResolver(id, this.ctx);
  }

  async feature(id: string) {
    const { FeatureResolver } = await import("./FeatureResolver.js");
    return new FeatureResolver(id, this.ctx);
  }

  async featureValue(id: string) {
    const { FeatureValueResolver } = await import("./FeatureValueResolver.js");
    return new FeatureValueResolver(id, this.ctx);
  }

  async seo(input: SeoShape) {
    const { SeoResolver } = await import("./SeoResolver.js");
    return new SeoResolver(input, this.ctx);
  }

  async bulkUpdateItem(id: string) {
    const { BulkUpdateItemResolver } = await import(
      "./BulkUpdateItemResolver.js"
    );
    return new BulkUpdateItemResolver(id, this.ctx);
  }

  async productBulkUpdateJob(id: string) {
    const { ProductBulkUpdateJobResolver } = await import(
      "./ProductBulkUpdateJobResolver.js"
    );
    return new ProductBulkUpdateJobResolver(id, this.ctx);
  }

  async productBulkUpdateJobConnection(input: BulkEditJobConnectionInput) {
    const { ProductBulkUpdateJobConnectionResolver } = await import(
      "./ProductBulkUpdateJobConnectionResolver.js"
    );
    return new ProductBulkUpdateJobConnectionResolver(input, this.ctx);
  }

  async inventoryWidget(productId: string) {
    const { InventoryWidgetResolver } = await import(
      "./InventoryWidgetResolver.js"
    );
    return new InventoryWidgetResolver(productId, this.ctx);
  }

  async pricingWidget(input: PricingWidgetInput) {
    const { PricingWidgetResolver } = await import(
      "./PricingWidgetResolver.js"
    );
    return new PricingWidgetResolver(input, this.ctx);
  }

  async catalogQuery() {
    const { CatalogQueryResolver } = await import("./QueryResolver.js");
    return new CatalogQueryResolver({}, this.ctx);
  }

  async widgetQuery() {
    const { WidgetQueryResolver } = await import("./QueryResolver.js");
    return new WidgetQueryResolver({}, this.ctx);
  }

  async inventoryQuery() {
    const { InventoryQueryResolver } = await import("./QueryResolver.js");
    return new InventoryQueryResolver({}, this.ctx);
  }

  async catalogMutation() {
    const { CatalogMutationResolver } = await import("./MutationResolver.js");
    return new CatalogMutationResolver({}, this.ctx);
  }

  async inventoryMutation() {
    const { InventoryMutationResolver } = await import("./MutationResolver.js");
    return new InventoryMutationResolver({}, this.ctx);
  }
}

import type { ServiceContext } from "../../context/types.js";
import type { SeoShape } from "./SeoResolver.js";
import type { SelectedOptionResolverInput } from "./SelectedOptionResolver.js";
import type { ProductComponentConfigurationInput } from "./ProductComponentResolvers.js";
import type { CategoryConnectionResolverInput } from "./CategoryConnectionResolver.js";
import type { ProductVariantConnectionInput } from "./ProductVariantConnectionResolver.js";
import type { MediaConnectionInput } from "./MediaConnectionResolver.js";

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

  async productVariant(id: string) {
    const { ProductVariantResolver } = await import(
      "./ProductVariantResolver.js"
    );
    return new ProductVariantResolver(id, this.ctx);
  }

  async category(id: string) {
    const { CategoryResolver } = await import("./CategoryResolver.js");
    return new CategoryResolver(id, this.ctx);
  }

  async categoryConnection(input: CategoryConnectionResolverInput) {
    const { CategoryConnectionResolver } = await import(
      "./CategoryConnectionResolver.js"
    );
    return new CategoryConnectionResolver(input, this.ctx);
  }

  async productVariantConnection(input: ProductVariantConnectionInput) {
    const { ProductVariantConnectionResolver } = await import(
      "./ProductVariantConnectionResolver.js"
    );
    return new ProductVariantConnectionResolver(input, this.ctx);
  }

  async mediaConnection(input: MediaConnectionInput) {
    const { MediaConnectionResolver } = await import(
      "./MediaConnectionResolver.js"
    );
    return new MediaConnectionResolver(input, this.ctx);
  }

  async vendor(id: string) {
    const { VendorResolver } = await import("./CatalogEntityResolvers.js");
    return new VendorResolver(id, this.ctx);
  }

  async tag(id: string) {
    const { TagResolver } = await import("./CatalogEntityResolvers.js");
    return new TagResolver(id, this.ctx);
  }

  async productOption(id: string) {
    const { ProductOptionResolver } = await import(
      "./CatalogEntityResolvers.js"
    );
    return new ProductOptionResolver(id, this.ctx);
  }

  async productOptionCategory(id: string) {
    const { ProductOptionCategoryResolver } = await import(
      "./CatalogEntityResolvers.js"
    );
    return new ProductOptionCategoryResolver(id, this.ctx);
  }

  async productOptionValue(id: string) {
    const { ProductOptionValueResolver } = await import(
      "./CatalogEntityResolvers.js"
    );
    return new ProductOptionValueResolver(id, this.ctx);
  }

  async productFeature(id: string) {
    const { ProductFeatureResolver } = await import(
      "./CatalogEntityResolvers.js"
    );
    return new ProductFeatureResolver(id, this.ctx);
  }

  async productFeatureGroup(id: string) {
    const { ProductFeatureGroupResolver } = await import(
      "./CatalogEntityResolvers.js"
    );
    return new ProductFeatureGroupResolver(id, this.ctx);
  }

  async productFeatureValue(id: string) {
    const { ProductFeatureValueResolver } = await import(
      "./CatalogEntityResolvers.js"
    );
    return new ProductFeatureValueResolver(id, this.ctx);
  }

  async inventoryItem(id: string) {
    const { InventoryItemResolver } = await import(
      "./CatalogEntityResolvers.js"
    );
    return new InventoryItemResolver(id, this.ctx);
  }

  async selectedOption(input: SelectedOptionResolverInput) {
    const { SelectedOptionResolver } = await import(
      "./SelectedOptionResolver.js"
    );
    return new SelectedOptionResolver(input, this.ctx);
  }

  async seo(input: SeoShape) {
    const { SeoResolver } = await import("./SeoResolver.js");
    return new SeoResolver(input, this.ctx);
  }

  async productComponentConfiguration(
    input: ProductComponentConfigurationInput,
  ) {
    const { ProductComponentConfigurationResolver } = await import(
      "./ProductComponentResolvers.js"
    );
    return new ProductComponentConfigurationResolver(input, this.ctx);
  }
}

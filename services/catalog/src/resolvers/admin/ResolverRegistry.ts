import type { ServiceContext } from "../../context/types.js";
import type { CategoryListingConnectionInput } from "./CategoryListingConnectionResolver.js";
import type { CategoryProductConnectionInput } from "./CategoryProductConnectionResolver.js";
import type { BundleConnectionInput } from "./BundleConnectionResolver.js";
import type { StockRelayInput } from "../../repositories/stock/StockRepository.js";
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

  async bundle(id: string) {
    const { BundleResolver } = await import("./BundleResolver.js");
    return new BundleResolver(id, this.ctx);
  }

  async bundleConnection(input: BundleConnectionInput) {
    const { BundleConnectionResolver } = await import(
      "./BundleConnectionResolver.js"
    );
    return new BundleConnectionResolver(input, this.ctx);
  }

  async category(id: string) {
    const { CategoryResolver } = await import("./CategoryResolver.js");
    return new CategoryResolver(id, this.ctx);
  }

  async categoryProductConnection(input: CategoryProductConnectionInput) {
    const { CategoryProductConnectionResolver } = await import(
      "./CategoryProductConnectionResolver.js"
    );
    return new CategoryProductConnectionResolver(input, this.ctx);
  }

  async categoryListingConnection(input: CategoryListingConnectionInput) {
    const { CategoryListingConnectionResolver } = await import(
      "./CategoryListingConnectionResolver.js"
    );
    return new CategoryListingConnectionResolver(input, this.ctx);
  }

  async variant(id: string) {
    const { VariantResolver } = await import("./VariantResolver.js");
    return new VariantResolver(id, this.ctx);
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

  async warehouse(id: string) {
    const { WarehouseResolver } = await import("./WarehouseResolver.js");
    return new WarehouseResolver(id, this.ctx);
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

  async facet(id: string) {
    const { FacetResolver } = await import("./FacetResolver.js");
    return new FacetResolver(id, this.ctx);
  }

  async facetValue(id: string) {
    const { FacetValueResolver } = await import("./FacetValueResolver.js");
    return new FacetValueResolver(id, this.ctx);
  }
}

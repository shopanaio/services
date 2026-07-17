import type { ServiceContext } from "../../context/types.js";

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

  async pricingQuery() {
    const { PricingQueryResolver } = await import("./QueryResolver.js");
    return new PricingQueryResolver({}, this.ctx);
  }

  async pricingMutation() {
    const { PricingMutationResolver } = await import("./MutationResolver.js");
    return new PricingMutationResolver({}, this.ctx);
  }

  async discount(id: string) {
    const { DiscountResolver } = await import("./DiscountResolver.js");
    return new DiscountResolver(id, this.ctx);
  }
}

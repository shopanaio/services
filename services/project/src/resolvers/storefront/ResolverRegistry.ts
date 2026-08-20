import type { ServiceContext } from "../../context/types.js";
import type { MarketConnectionInput } from "./MarketConnectionResolver.js";

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

  async store(id: string) {
    const { StoreResolver } = await import("./StoreResolver.js");
    return new StoreResolver(id, this.ctx);
  }

  async market(id: string) {
    const { MarketResolver } = await import("./MarketResolver.js");
    return new MarketResolver(id, this.ctx);
  }

  async marketConnection(input: MarketConnectionInput) {
    const { MarketConnectionResolver } = await import("./MarketConnectionResolver.js");
    return new MarketConnectionResolver(input, this.ctx);
  }

  async localization(input: { storeId: string; marketId: string }) {
    const { LocalizationResolver } = await import("./LocalizationResolver.js");
    return new LocalizationResolver(input, this.ctx);
  }
}

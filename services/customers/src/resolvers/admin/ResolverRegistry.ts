import type { ServiceContext } from "../../context/types.js";

const registries = new WeakMap<ServiceContext, ResolverRegistry>();

export function getResolverRegistry(ctx: ServiceContext): ResolverRegistry {
  const existing = registries.get(ctx);
  if (existing) {
    return existing;
  }

  const registry = new ResolverRegistry(ctx);
  registries.set(ctx, registry);
  return registry;
}

export class ResolverRegistry {
  constructor(private readonly ctx: ServiceContext) {}

  async customersQuery() {
    const { CustomersQueryResolver } = await import("./QueryResolver.js");
    return new CustomersQueryResolver({}, this.ctx);
  }

  async customersMutation() {
    const { CustomersMutationResolver } = await import("./MutationResolver.js");
    return new CustomersMutationResolver({}, this.ctx);
  }
}

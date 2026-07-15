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

  async reviewsQuery() {
    const { ReviewsQueryResolver } = await import("./QueryResolver.js");
    return new ReviewsQueryResolver({}, this.ctx);
  }

  async reviewsMutation() {
    const { ReviewsMutationResolver } = await import("./MutationResolver.js");
    return new ReviewsMutationResolver({}, this.ctx);
  }
}

import type { ServiceContext } from "../../context/types.js";

const registries = new WeakMap<ServiceContext, ServiceResolverRegistry>();

export function getServiceResolverRegistry(ctx: ServiceContext): ServiceResolverRegistry {
  const existing = registries.get(ctx);
  if (existing) return existing;

  const registry = new ServiceResolverRegistry(ctx);
  registries.set(ctx, registry);
  return registry;
}

export class ServiceResolverRegistry {
  constructor(private readonly ctx: ServiceContext) {}

  async productSnapshot(id: string) {
    const { ProductSnapshotResolver } = await import(
      "./ProductSnapshotResolver.js"
    );
    return new ProductSnapshotResolver(id, this.ctx);
  }
}

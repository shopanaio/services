import type { ServiceContext } from "../../context/types.js";
import type {
  CustomerWishlistConnectionInput,
  CustomerWishlistItemConnectionInput,
} from "../../repositories/wishlist/CustomerWishlistRepository.js";

const registries = new WeakMap<ServiceContext, StorefrontResolverRegistry>();

export function getStorefrontResolverRegistry(
  ctx: ServiceContext,
): StorefrontResolverRegistry {
  const existing = registries.get(ctx);
  if (existing) return existing;
  const registry = new StorefrontResolverRegistry(ctx);
  registries.set(ctx, registry);
  return registry;
}

export class StorefrontResolverRegistry {
  constructor(private readonly ctx: ServiceContext) {}

  async customer(id: string) {
    const { StorefrontCustomerResolver } = await import(
      "./StorefrontCustomerResolver.js"
    );
    return new StorefrontCustomerResolver(id, this.ctx);
  }

  async wishlist(id: string) {
    const { CustomerWishlistResolver } = await import(
      "./WishlistResolvers.js"
    );
    return new CustomerWishlistResolver(id, this.ctx);
  }

  async wishlistItem(id: string) {
    const { CustomerWishlistItemResolver } = await import(
      "./WishlistResolvers.js"
    );
    return new CustomerWishlistItemResolver(id, this.ctx);
  }

  async wishlistConnection(input: CustomerWishlistConnectionInput) {
    const { CustomerWishlistConnectionResolver } = await import(
      "./WishlistConnectionResolvers.js"
    );
    return new CustomerWishlistConnectionResolver(input, this.ctx);
  }

  async wishlistItemConnection(input: CustomerWishlistItemConnectionInput) {
    const { CustomerWishlistItemConnectionResolver } = await import(
      "./WishlistConnectionResolvers.js"
    );
    return new CustomerWishlistItemConnectionResolver(input, this.ctx);
  }
}

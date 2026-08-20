import type { ServiceContext } from "../../context/types.js";
import type {
  CustomerWishlistConnectionInput,
  CustomerWishlistItemConnectionInput,
} from "../../repositories/wishlist/CustomerWishlistRepository.js";
import type { CustomerAddressConnectionInput } from "../../repositories/address/CustomerAddressRepository.js";
import type { CustomerDataRequestConnectionInput } from "../../repositories/lifecycle/CustomerLifecycleRepository.js";
import type { CustomerTaxExemptionConnectionInput } from "../../repositories/tax/CustomerTaxExemptionRepository.js";
import type { CustomerTaxIdentifierConnectionInput } from "../../repositories/tax/CustomerTaxIdentifierRepository.js";

const registries = new WeakMap<ServiceContext, StorefrontResolverRegistry>();

export function getStorefrontResolverRegistry(ctx: ServiceContext): StorefrontResolverRegistry {
  const existing = registries.get(ctx);
  if (existing) return existing;
  const registry = new StorefrontResolverRegistry(ctx);
  registries.set(ctx, registry);
  return registry;
}

export class StorefrontResolverRegistry {
  constructor(private readonly ctx: ServiceContext) {}

  async customer(id: string) {
    const { StorefrontCustomerResolver } = await import("./StorefrontCustomerResolver.js");
    return new StorefrontCustomerResolver(id, this.ctx);
  }

  async wishlist(id: string) {
    const { CustomerWishlistResolver } = await import("./WishlistResolvers.js");
    return new CustomerWishlistResolver(id, this.ctx);
  }

  async address(id: string) {
    const { StorefrontCustomerAddressResolver } = await import("./CustomerSelfServiceResolvers.js");
    return new StorefrontCustomerAddressResolver(id, this.ctx);
  }

  async consent(id: string) {
    const { StorefrontCustomerConsentResolver } = await import("./CustomerSelfServiceResolvers.js");
    return new StorefrontCustomerConsentResolver(id, this.ctx);
  }

  async dataRequest(id: string) {
    const { StorefrontCustomerDataRequestResolver } =
      await import("./CustomerSelfServiceResolvers.js");
    return new StorefrontCustomerDataRequestResolver(id, this.ctx);
  }

  async taxIdentifier(id: string) {
    const { StorefrontCustomerTaxIdentifierResolver } =
      await import("./CustomerSelfServiceResolvers.js");
    return new StorefrontCustomerTaxIdentifierResolver(id, this.ctx);
  }

  async taxExemption(id: string) {
    const { StorefrontCustomerTaxExemptionResolver } =
      await import("./CustomerSelfServiceResolvers.js");
    return new StorefrontCustomerTaxExemptionResolver(id, this.ctx);
  }

  async addressConnection(input: CustomerAddressConnectionInput) {
    const { StorefrontCustomerAddressConnectionResolver } =
      await import("./CustomerSelfServiceConnectionResolvers.js");
    return new StorefrontCustomerAddressConnectionResolver(input, this.ctx);
  }

  async dataRequestConnection(input: CustomerDataRequestConnectionInput) {
    const { StorefrontCustomerDataRequestConnectionResolver } =
      await import("./CustomerSelfServiceConnectionResolvers.js");
    return new StorefrontCustomerDataRequestConnectionResolver(input, this.ctx);
  }

  async taxIdentifierConnection(input: CustomerTaxIdentifierConnectionInput) {
    const { StorefrontCustomerTaxIdentifierConnectionResolver } =
      await import("./CustomerSelfServiceConnectionResolvers.js");
    return new StorefrontCustomerTaxIdentifierConnectionResolver(input, this.ctx);
  }

  async taxExemptionConnection(input: CustomerTaxExemptionConnectionInput) {
    const { StorefrontCustomerTaxExemptionConnectionResolver } =
      await import("./CustomerSelfServiceConnectionResolvers.js");
    return new StorefrontCustomerTaxExemptionConnectionResolver(input, this.ctx);
  }

  async wishlistItem(id: string) {
    const { CustomerWishlistItemResolver } = await import("./WishlistResolvers.js");
    return new CustomerWishlistItemResolver(id, this.ctx);
  }

  async wishlistConnection(input: CustomerWishlistConnectionInput) {
    const { CustomerWishlistConnectionResolver } = await import("./WishlistConnectionResolvers.js");
    return new CustomerWishlistConnectionResolver(input, this.ctx);
  }

  async wishlistItemConnection(input: CustomerWishlistItemConnectionInput) {
    const { CustomerWishlistItemConnectionResolver } =
      await import("./WishlistConnectionResolvers.js");
    return new CustomerWishlistItemConnectionResolver(input, this.ctx);
  }
}

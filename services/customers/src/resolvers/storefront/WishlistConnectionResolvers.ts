import type {
  CustomerWishlistConnectionInput,
  CustomerWishlistItemConnectionInput,
} from "../../repositories/wishlist/CustomerWishlistRepository.js";
import {
  BaseConnectionResolver,
  type ConnectionData,
} from "./connection/BaseConnectionResolver.js";

export class CustomerWishlistConnectionResolver extends BaseConnectionResolver<CustomerWishlistConnectionInput> {
  $preload(): Promise<ConnectionData> {
    return this.$ctx.kernel.repository.wishlist.getConnection(this.$props);
  }

  protected createNodeResolver(nodeId: string) {
    return this.resolvers.wishlist(nodeId);
  }
}

export class CustomerWishlistItemConnectionResolver extends BaseConnectionResolver<CustomerWishlistItemConnectionInput> {
  $preload(): Promise<ConnectionData> {
    return this.$ctx.kernel.repository.wishlist.getItemConnection(this.$props);
  }

  protected createNodeResolver(nodeId: string) {
    return this.resolvers.wishlistItem(nodeId);
  }
}

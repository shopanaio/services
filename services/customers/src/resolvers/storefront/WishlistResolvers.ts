import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { PreloadNotFoundError } from "@shopana/type-resolver";
import type { CustomerWishlist, CustomerWishlistItem } from "../../repositories/models/index.js";
import type { CustomerWishlistItemsArgs } from "./generated/types.js";
import { StorefrontCustomersType } from "./StorefrontCustomersType.js";

export class CustomerWishlistResolver extends StorefrontCustomersType<string, CustomerWishlist> {
  async $preload(): Promise<CustomerWishlist> {
    const wishlist = await this.$ctx.loaders.wishlist.load(this.$props);
    if (!wishlist) {
      throw new PreloadNotFoundError("Customer wishlist was not found");
    }
    return wishlist;
  }

  id() {
    return this.encodeId(this.$props, GlobalIdEntity.CustomerWishlist);
  }

  name() {
    return this.$get("name");
  }

  isDefault() {
    return this.$get("isDefault");
  }

  async customer() {
    return this.resolvers.customer(await this.$get("customerId"));
  }

  items(args: CustomerWishlistItemsArgs) {
    const customerId = this.$ctx.customer?.id;
    if (!customerId) {
      throw new PreloadNotFoundError("Authenticated customer was not found");
    }
    return this.resolvers.wishlistItemConnection({
      ...args,
      customerId,
      wishlistId: this.$props,
    });
  }

  createdAt() {
    return this.$get("createdAt");
  }

  updatedAt() {
    return this.$get("updatedAt");
  }
}

export class CustomerWishlistItemResolver extends StorefrontCustomersType<
  string,
  CustomerWishlistItem
> {
  async $preload(): Promise<CustomerWishlistItem> {
    const item = await this.$ctx.loaders.wishlistItem.load(this.$props);
    if (!item) {
      throw new PreloadNotFoundError("Customer wishlist item was not found");
    }
    return item;
  }

  id() {
    return this.encodeId(this.$props, GlobalIdEntity.CustomerWishlistItem);
  }

  async wishlist() {
    return this.resolvers.wishlist(await this.$get("wishlistId"));
  }

  async product() {
    const productId = await this.$get("productId");
    const isPublished = await this.$ctx.loaders.publishedWishlistProduct.load(productId);
    return isPublished
      ? {
          __typename: "Product" as const,
          id: this.encodeId(productId, GlobalIdEntity.Product),
        }
      : null;
  }

  addedAt() {
    return this.$get("addedAt");
  }
}

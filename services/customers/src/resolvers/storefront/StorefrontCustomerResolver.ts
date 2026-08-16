import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { PreloadNotFoundError } from "@shopana/type-resolver";
import type { Customer } from "../../repositories/models/index.js";
import type {
  CustomerWishlistArgs,
  CustomerWishlistsArgs,
} from "./generated/types.js";
import { StorefrontCustomersType } from "./StorefrontCustomersType.js";

export class StorefrontCustomerResolver extends StorefrontCustomersType<
  string,
  Customer
> {
  async $preload(): Promise<Customer> {
    const customer = await this.$ctx.loaders.customer.load(this.$props);
    if (!customer || customer.lifecycleStatus !== "ACTIVE") {
      throw new PreloadNotFoundError("Customer was not found");
    }
    return customer;
  }

  id() {
    return this.encodeId(this.$props, GlobalIdEntity.Customer);
  }

  revision() {
    return this.$get("revision");
  }

  accountStatus() {
    return this.$get("accountStatus");
  }

  prefix() {
    return this.$get("prefix");
  }

  firstName() {
    return this.$get("firstName");
  }

  middleName() {
    return this.$get("middleName");
  }

  lastName() {
    return this.$get("lastName");
  }

  suffix() {
    return this.$get("suffix");
  }

  preferredLocale() {
    return this.$get("preferredLocale");
  }

  dateOfBirth() {
    return this.$get("dateOfBirth");
  }

  gender() {
    return this.$get("gender");
  }

  companyName() {
    return this.$get("companyName");
  }

  jobTitle() {
    return this.$get("jobTitle");
  }

  async displayName(): Promise<string> {
    const customer = await this.$preload();
    return (
      [
        customer.prefix,
        customer.firstName,
        customer.middleName,
        customer.lastName,
        customer.suffix,
      ]
        .map((part) => part?.trim())
        .filter((part): part is string => Boolean(part))
        .join(" ") ||
      customer.companyName?.trim() ||
      customer.email ||
      customer.phoneE164 ||
      "Customer"
    );
  }

  async emailAddress() {
    const customer = await this.$preload();
    return customer.email
      ? {
          emailAddress: customer.email,
          verified: customer.emailVerified,
          marketingConsent: null,
        }
      : null;
  }

  async phoneNumber() {
    const customer = await this.$preload();
    return customer.phoneE164
      ? {
          phoneNumber: customer.phoneE164,
          verified: customer.phoneVerified,
          marketingConsent: null,
        }
      : null;
  }

  wishlists(args: CustomerWishlistsArgs) {
    return this.resolvers.wishlistConnection({
      ...args,
      customerId: this.$props,
    });
  }

  async defaultWishlist() {
    const wishlist = await this.$ctx.loaders.defaultWishlist.load(this.$props);
    return wishlist ? this.resolvers.wishlist(wishlist.id) : null;
  }

  async wishlist(args: CustomerWishlistArgs) {
    let wishlistId: string;
    try {
      wishlistId = this.decodeId(args.id, GlobalIdEntity.CustomerWishlist);
    } catch {
      return null;
    }
    const wishlist = await this.$ctx.loaders.wishlist.load(wishlistId);
    return wishlist ? this.resolvers.wishlist(wishlist.id) : null;
  }

  createdAt() {
    return this.$get("createdAt");
  }

  updatedAt() {
    return this.$get("updatedAt");
  }
}

import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { PreloadNotFoundError } from "@shopana/type-resolver";
import type { Customer } from "../../repositories/models/index.js";
import type {
  CustomerAddressArgs,
  CustomerAddressesArgs,
  CustomerDataRequestArgs,
  CustomerDataRequestsArgs,
  CustomerTaxExemptionsArgs,
  CustomerTaxIdentifiersArgs,
  CustomerWishlistArgs,
  CustomerWishlistsArgs,
} from "./generated/types.js";
import { StorefrontCustomersType } from "./StorefrontCustomersType.js";

export class StorefrontCustomerResolver extends StorefrontCustomersType<string, Customer> {
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
      [customer.prefix, customer.firstName, customer.middleName, customer.lastName, customer.suffix]
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
    const consent = (await this.$ctx.loaders.consentsByCustomer.load(this.$props)).find(
      (item) => item.channel === "EMAIL",
    );
    return customer.email
      ? {
          emailAddress: customer.email,
          verified: customer.emailVerified,
          marketingConsent: consent ? await this.resolvers.consent(consent.id) : null,
        }
      : null;
  }

  async phoneNumber() {
    const customer = await this.$preload();
    const consent = (await this.$ctx.loaders.consentsByCustomer.load(this.$props)).find(
      (item) => item.channel === "SMS",
    );
    return customer.phoneE164
      ? {
          phoneNumber: customer.phoneE164,
          verified: customer.phoneVerified,
          marketingConsent: consent ? await this.resolvers.consent(consent.id) : null,
        }
      : null;
  }

  async defaultShippingAddress() {
    const address = await this.$ctx.kernel.repository.address.findDefaultShipping(this.$props);
    return address ? this.resolvers.address(address.id) : null;
  }

  async defaultBillingAddress() {
    const address = await this.$ctx.kernel.repository.address.findDefaultBilling(this.$props);
    return address ? this.resolvers.address(address.id) : null;
  }

  async address(args: CustomerAddressArgs) {
    let addressId: string;
    try {
      addressId = this.decodeId(args.id, GlobalIdEntity.CustomerAddress);
    } catch {
      return null;
    }
    const address = await this.$ctx.loaders.address.load(addressId);
    return address?.customerId === this.$props ? this.resolvers.address(address.id) : null;
  }

  addresses(args: CustomerAddressesArgs) {
    return this.resolvers.addressConnection({
      ...args,
      customerId: this.$props,
    });
  }

  async marketingConsents() {
    const consents = await this.$ctx.loaders.consentsByCustomer.load(this.$props);
    return Promise.all(consents.map((consent) => this.resolvers.consent(consent.id)));
  }

  taxIdentifiers(args: CustomerTaxIdentifiersArgs) {
    return this.resolvers.taxIdentifierConnection({
      ...args,
      customerId: this.$props,
    });
  }

  taxExemptions(args: CustomerTaxExemptionsArgs) {
    return this.resolvers.taxExemptionConnection({
      ...args,
      customerId: this.$props,
    });
  }

  async dataRequest(args: CustomerDataRequestArgs) {
    let requestId: string;
    try {
      requestId = this.decodeId(args.id, GlobalIdEntity.CustomerDataRequest);
    } catch {
      return null;
    }
    const request = await this.$ctx.loaders.customerDataRequest.load(requestId);
    return request?.customerId === this.$props ? this.resolvers.dataRequest(request.id) : null;
  }

  dataRequests(args: CustomerDataRequestsArgs) {
    return this.resolvers.dataRequestConnection({
      ...args,
      customerId: this.$props,
    });
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

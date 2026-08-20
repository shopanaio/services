import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { PreloadNotFoundError } from "@shopana/type-resolver";
import type { CustomerAddress } from "../../repositories/models/index.js";
import { CustomersType } from "./CustomersType.js";

export class CustomerAddressResolver extends CustomersType<string, CustomerAddress> {
  async $preload() {
    const address = await this.$ctx.loaders.address.load(this.$props);
    if (!address) {
      throw new PreloadNotFoundError(`Customer address with ID ${this.$props} not found`);
    }
    return address;
  }

  id() {
    return this.encodeId(this.$props, GlobalIdEntity.CustomerAddress);
  }

  async customer() {
    return this.resolvers.customer(await this.$get("customerId"));
  }

  label() {
    return this.$get("label");
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

  companyName() {
    return this.$get("companyName");
  }

  phoneE164() {
    return this.$get("phoneE164");
  }

  address1() {
    return this.$get("address1");
  }

  address2() {
    return this.$get("address2");
  }

  city() {
    return this.$get("city");
  }

  regionName() {
    return this.$get("regionName");
  }

  regionCode() {
    return this.$get("regionCode");
  }

  postalCode() {
    return this.$get("postalCode");
  }

  countryCode() {
    return this.$get("countryCode");
  }

  isDefaultShipping() {
    return this.$get("isDefaultShipping");
  }

  isDefaultBilling() {
    return this.$get("isDefaultBilling");
  }

  validationStatus() {
    return this.$get("validationStatus");
  }

  validatedAt() {
    return this.$get("validatedAt");
  }

  async latitude() {
    const value = await this.$get("latitude");
    return value === null ? null : Number(value);
  }

  async longitude() {
    const value = await this.$get("longitude");
    return value === null ? null : Number(value);
  }

  createdAt() {
    return this.$get("createdAt");
  }

  updatedAt() {
    return this.$get("updatedAt");
  }

  deletedAt() {
    return this.$get("deletedAt");
  }
}

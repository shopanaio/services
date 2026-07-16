import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { PreloadNotFoundError } from "@shopana/type-resolver";
import type { CustomerTaxIdentifier } from "../../repositories/models/index.js";
import { CustomersType } from "./CustomersType.js";

export class CustomerTaxIdentifierResolver extends CustomersType<
  string,
  CustomerTaxIdentifier
> {
  async $preload() {
    const taxIdentifier = await this.$ctx.loaders.taxIdentifier.load(
      this.$props
    );
    if (!taxIdentifier) {
      throw new PreloadNotFoundError(
        `Customer tax identifier with ID ${this.$props} not found`
      );
    }
    return taxIdentifier;
  }

  id() {
    return this.encodeId(this.$props, GlobalIdEntity.CustomerTaxIdentifier);
  }

  async customer() {
    return this.resolvers.customer(await this.$get("customerId"));
  }

  identifierType() {
    return this.$get("identifierType");
  }

  countryCode() {
    return this.$get("countryCode");
  }

  value() {
    return this.$get("value");
  }

  normalizedValue() {
    return this.$get("normalizedValue");
  }

  status() {
    return this.$get("status");
  }

  isPrimary() {
    return this.$get("isPrimary");
  }

  verifiedAt() {
    return this.$get("verifiedAt");
  }

  validFrom() {
    return this.$get("validFrom");
  }

  validTo() {
    return this.$get("validTo");
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

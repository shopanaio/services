import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { PreloadNotFoundError } from "@shopana/type-resolver";
import type { CustomerTaxExemption } from "../../repositories/models/index.js";
import { CustomersType } from "./CustomersType.js";

export class CustomerTaxExemptionResolver extends CustomersType<string, CustomerTaxExemption> {
  async $preload() {
    const taxExemption = await this.$ctx.loaders.taxExemption.load(this.$props);
    if (!taxExemption) {
      throw new PreloadNotFoundError(`Customer tax exemption with ID ${this.$props} not found`);
    }
    return taxExemption;
  }

  id() {
    return this.encodeId(this.$props, GlobalIdEntity.CustomerTaxExemption);
  }

  async customer() {
    return this.resolvers.customer(await this.$get("customerId"));
  }

  code() {
    return this.$get("code");
  }

  countryCode() {
    return this.$get("countryCode");
  }

  regionCode() {
    return this.$get("regionCode");
  }

  reason() {
    return this.$get("reason");
  }

  status() {
    return this.$get("status");
  }

  async certificateFileId() {
    const fileId = await this.$get("certificateFileId");
    return fileId ? this.encodeId(fileId, GlobalIdEntity.File) : null;
  }

  async certificateFile() {
    const fileId = await this.$get("certificateFileId");
    return fileId
      ? {
          __typename: "File" as const,
          id: this.encodeId(fileId, GlobalIdEntity.File),
        }
      : null;
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

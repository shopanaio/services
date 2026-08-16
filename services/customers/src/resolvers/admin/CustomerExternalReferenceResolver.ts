import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { PreloadNotFoundError, SubgraphReference } from "@shopana/type-resolver";
import type { CustomerExternalReference } from "../../repositories/models/index.js";
import { CustomersType } from "./CustomersType.js";

@SubgraphReference()
export class CustomerExternalReferenceResolver extends CustomersType<
  string,
  CustomerExternalReference
> {
  async $preload() {
    const reference = await this.$ctx.loaders.externalReference.load(
      this.$props
    );
    if (!reference) {
      throw new PreloadNotFoundError(
        `Customer external reference with ID ${this.$props} not found`
      );
    }
    return reference;
  }

  id() {
    return this.encodeId(
      this.$props,
      GlobalIdEntity.CustomerExternalReference
    );
  }

  async customer() {
    return this.resolvers.customer(await this.$get("customerId"));
  }

  externalSystem() {
    return this.$get("externalSystem");
  }

  externalType() {
    return this.$get("externalType");
  }

  externalId() {
    return this.$get("externalId");
  }

  metadata() {
    return this.$get("metadata");
  }

  createdAt() {
    return this.$get("createdAt");
  }

  updatedAt() {
    return this.$get("updatedAt");
  }
}

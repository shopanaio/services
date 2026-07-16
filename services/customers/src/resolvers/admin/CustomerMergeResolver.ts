import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { PreloadNotFoundError } from "@shopana/type-resolver";
import type { CustomerMerge } from "../../repositories/models/index.js";
import { CustomersType } from "./CustomersType.js";

export class CustomerMergeResolver extends CustomersType<string, CustomerMerge> {
  async $preload() {
    const merge = await this.$ctx.loaders.customerMerge.load(this.$props);
    if (!merge) {
      throw new PreloadNotFoundError(
        `Customer merge with ID ${this.$props} not found`
      );
    }
    return merge;
  }

  id() {
    return this.encodeId(this.$props, GlobalIdEntity.CustomerMerge);
  }

  async sourceCustomer() {
    return this.resolvers.customer(await this.$get("sourceCustomerId"));
  }

  async targetCustomer() {
    return this.resolvers.customer(await this.$get("targetCustomerId"));
  }

  status() {
    return this.$get("status");
  }

  reason() {
    return this.$get("reason");
  }

  requestedByType() {
    return this.$get("requestedByType");
  }

  requestedById() {
    return this.$get("requestedById");
  }

  idempotencyKey() {
    return this.$get("idempotencyKey");
  }

  resolution() {
    return this.$get("resolution");
  }

  errorCode() {
    return this.$get("errorCode");
  }

  errorMessage() {
    return this.$get("errorMessage");
  }

  requestedAt() {
    return this.$get("requestedAt");
  }

  startedAt() {
    return this.$get("startedAt");
  }

  finishedAt() {
    return this.$get("finishedAt");
  }

  updatedAt() {
    return this.$get("updatedAt");
  }
}

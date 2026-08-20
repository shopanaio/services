import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { PreloadNotFoundError } from "@shopana/type-resolver";
import type { CustomerDataRequest } from "../../repositories/models/index.js";
import { CustomersType } from "./CustomersType.js";

export class CustomerDataRequestResolver extends CustomersType<string, CustomerDataRequest> {
  async $preload() {
    const request = await this.$ctx.loaders.customerDataRequest.load(this.$props);
    if (!request) {
      throw new PreloadNotFoundError(`Customer data request with ID ${this.$props} not found`);
    }
    return request;
  }

  id() {
    return this.encodeId(this.$props, GlobalIdEntity.CustomerDataRequest);
  }

  async customer() {
    return this.resolvers.customer(await this.$get("customerId"));
  }

  type() {
    return this.$get("type");
  }

  status() {
    return this.$get("status");
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

  legalBasis() {
    return this.$get("legalBasis");
  }

  requestMetadata() {
    return this.$get("requestMetadata");
  }

  async resultFileId() {
    const fileId = await this.$get("resultFileId");
    return fileId ? this.encodeId(fileId, GlobalIdEntity.File) : null;
  }

  async resultFile() {
    const fileId = await this.$get("resultFileId");
    return fileId
      ? {
          __typename: "File" as const,
          id: this.encodeId(fileId, GlobalIdEntity.File),
        }
      : null;
  }

  rejectionReason() {
    return this.$get("rejectionReason");
  }

  requestedAt() {
    return this.$get("requestedAt");
  }

  dueAt() {
    return this.$get("dueAt");
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

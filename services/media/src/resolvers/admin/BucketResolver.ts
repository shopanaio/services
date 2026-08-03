import { PreloadNotFoundError, TypePolicy } from "@shopana/type-resolver";
import { MediaType } from "./MediaType.js";
import {
  encodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import type { Bucket } from "../../repositories/models/index.js";

/**
 * Bucket resolver - resolves Bucket type
 */
@TypePolicy<BucketResolver>({
  resource: "store.data",
  action: "read",
  organizationId: (resolver) => resolver.$ctx.store.organizationId,
  domain: (resolver) => `store:${resolver.$ctx.store.id}`,
  onDeny: "null",
})
export class BucketResolver extends MediaType<string, Bucket> {
  async $preload() {
    const bucket = await this.$ctx.kernel.repository.bucket.findAccessibleById(
      this.$props,
      {
        storeId: this.$ctx.store.id,
        organizationId: this.$ctx.store.organizationId,
        userId: this.$ctx.user.id,
      }
    );
    if (!bucket) {
      throw new PreloadNotFoundError(`Bucket not found: ${this.$props}`);
    }
    return bucket;
  }

  id() {
    return encodeGlobalIdByType(this.$props, GlobalIdEntity.Bucket);
  }

  async bucketName() {
    return this.$get("bucketName");
  }

  async region() {
    return this.$get("region");
  }

  async status() {
    return this.$get("status");
  }

  async priority() {
    return this.$get("priority");
  }

  async endpointUrl() {
    return this.$get("endpointUrl");
  }

  async createdAt() {
    return this.$get("createdAt");
  }

  async updatedAt() {
    return this.$get("updatedAt");
  }
}

import { MediaType, Cache } from "./MediaType.js";
import {
  encodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import type { Bucket } from "../../repositories/models/index.js";

/**
 * Bucket resolver - resolves Bucket type
 */
export class BucketResolver extends MediaType<string, Bucket> {
  @Cache({
    cacheName: "media:bucket",
    key: (resolver: BucketResolver) => resolver.$props,
  })
  async $preload() {
    const bucket = await this.$ctx.kernel.repository.bucket.findById(
      this.$ctx.store.id,
      this.$props
    );
    if (!bucket) {
      throw new Error(`Bucket not found: ${this.$props}`);
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

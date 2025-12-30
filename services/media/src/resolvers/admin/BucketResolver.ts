import { MediaType, Cache } from "./MediaType.js";
import { encodeGlobalId } from "./utils/globalId.js";
import type { Bucket } from "../../repositories/models/index.js";

/**
 * Bucket resolver - resolves Bucket type
 */
export class BucketResolver extends MediaType<string, Bucket | null> {
  @Cache({
    cacheName: "media:bucket",
    key: (resolver: BucketResolver) => resolver.value,
  })
  async $preload() {
    return this.ctx.kernel.repository.bucket.findById(
      this.ctx.store.id,
      this.value
    );
  }

  id() {
    return encodeGlobalId("Bucket", this.value);
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
    const date = await this.$get("createdAt");
    return date?.toISOString() ?? null;
  }

  async updatedAt() {
    const date = await this.$get("updatedAt");
    return date?.toISOString() ?? null;
  }
}

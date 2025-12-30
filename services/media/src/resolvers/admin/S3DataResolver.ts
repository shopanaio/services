import { MediaType, Cache } from "./MediaType.js";
import { BucketResolver } from "./BucketResolver.js";
import type { S3Object } from "../../repositories/models/index.js";

/**
 * S3Data resolver - resolves S3 storage data for files
 */
export class S3DataResolver extends MediaType<string, S3Object | null> {
  @Cache({
    cacheName: "media:s3object",
    key: (resolver: S3DataResolver) => resolver.value,
  })
  async $preload() {
    return this.ctx.loaders.s3Object.load(this.value);
  }

  async objectKey() {
    return this.$get("objectKey");
  }

  async contentHash() {
    return this.$get("contentHash");
  }

  async etag() {
    return this.$get("etag");
  }

  async storageClass() {
    return this.$get("storageClass");
  }

  async bucket() {
    const bucketId = await this.$get("bucketId");
    if (!bucketId) {
      return null;
    }
    return new BucketResolver(bucketId, this.ctx);
  }
}

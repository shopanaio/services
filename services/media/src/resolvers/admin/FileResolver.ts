import { SubgraphReference } from "@shopana/type-resolver";
import { MediaType, Cache } from "./MediaType.js";
import { S3DataResolver } from "./S3DataResolver.js";
import { ExternalDataResolver } from "./ExternalDataResolver.js";
import { encodeGlobalId, decodeGlobalId } from "./utils/globalId.js";
import type { File } from "../../repositories/models/index.js";

/**
 * File resolver - resolves File type
 */
@SubgraphReference()
export class FileResolver extends MediaType<string, File | null> {
  @Cache({
    cacheName: "media:file",
    key: (resolver: FileResolver) => resolver.value,
  })
  async $preload() {
    return this.ctx.loaders.file.load(this.value);
  }

  id() {
    return encodeGlobalId("File", this.value);
  }

  async url() {
    return this.$get("url");
  }

  async mimeType() {
    return this.$get("mimeType");
  }

  async ext() {
    return this.$get("ext");
  }

  async sizeBytes() {
    const size = await this.$get("sizeBytes");
    return size?.toString() ?? null;
  }

  async originalName() {
    return this.$get("originalName");
  }

  async width() {
    return this.$get("width");
  }

  async height() {
    return this.$get("height");
  }

  async dimensions() {
    const width = await this.$get("width");
    const height = await this.$get("height");
    if (width && height) {
      return { width, height };
    }
    return null;
  }

  async durationMs() {
    return this.$get("durationMs");
  }

  async altText() {
    return this.$get("altText");
  }

  async sourceUrl() {
    return this.$get("sourceUrl");
  }

  async provider() {
    return this.$get("provider");
  }

  async isProcessed() {
    return this.$get("isProcessed");
  }

  async meta() {
    return this.$get("meta");
  }

  async createdAt() {
    const date = await this.$get("createdAt");
    return date?.toISOString() ?? null;
  }

  async updatedAt() {
    const date = await this.$get("updatedAt");
    return date?.toISOString() ?? null;
  }

  async deletedAt() {
    const date = await this.$get("deletedAt");
    return date?.toISOString() ?? null;
  }

  /**
   * Resolve S3 data for S3 provider files
   */
  async s3Data() {
    const provider = await this.$get("provider");
    if (provider !== "S3") {
      return null;
    }
    return new S3DataResolver(this.value, this.ctx);
  }

  /**
   * Resolve external media data for YouTube/Vimeo/URL providers
   */
  async externalData() {
    const provider = await this.$get("provider");
    if (!["YOUTUBE", "VIMEO", "URL"].includes(provider ?? "")) {
      return null;
    }
    return new ExternalDataResolver(this.value, this.ctx);
  }
}

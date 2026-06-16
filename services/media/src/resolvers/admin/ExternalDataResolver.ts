import { MediaType, Cache } from "./MediaType.js";
import type { ExternalMedia } from "../../repositories/models/index.js";

/**
 * ExternalData resolver - resolves external media data (YouTube, Vimeo, etc.)
 */
export class ExternalDataResolver extends MediaType<string, ExternalMedia> {
  async $preload() {
    const externalMedia = await this.$ctx.loaders.externalMedia.load(
      this.$props
    );
    if (!externalMedia) {
      throw new Error(`External media not found for file: ${this.$props}`);
    }
    return externalMedia;
  }

  async externalId() {
    return this.$get("externalId");
  }

  async providerMeta() {
    return this.$get("providerMeta");
  }
}

import { PreloadNotFoundError } from "@shopana/type-resolver";
import type { File } from "../../repositories/models/index.js";
import { resolveDeliveryUrl } from "./helpers/storefrontFile.js";
import { MediaType } from "./MediaType.js";

export interface StorefrontSourceInput {
  fileId: string;
  format: string;
}

export class VideoSourceResolver extends MediaType<
  StorefrontSourceInput,
  File
> {
  async $preload() {
    if (!this.$ctx.storefrontStore) {
      throw new PreloadNotFoundError("Storefront media context is unavailable");
    }
    const file = await this.$ctx.loaders.file.load(this.$props.fileId);
    if (!file) {
      throw new PreloadNotFoundError(
        `Storefront media source not found: ${this.$props.fileId}`,
      );
    }
    return file;
  }

  format() {
    return this.$props.format;
  }

  async height() {
    return this.$get("height");
  }

  async mimeType() {
    return this.$get("mimeType");
  }

  async url() {
    return resolveDeliveryUrl(this.$ctx, await this.$data);
  }

  async width() {
    return this.$get("width");
  }
}

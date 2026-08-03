import { PreloadNotFoundError } from "@shopana/type-resolver";
import type { File } from "../../repositories/models/index.js";
import { resolveDeliveryUrl } from "./helpers/storefrontFile.js";
import { MediaType } from "./MediaType.js";
import type { StorefrontSourceInput } from "./VideoSourceResolver.js";

export class Model3dSourceResolver extends MediaType<
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

  async filesize() {
    return (await this.$get("sizeBytes")).toString();
  }

  format() {
    return this.$props.format;
  }

  async mimeType() {
    return this.$get("mimeType");
  }

  async url() {
    return resolveDeliveryUrl(this.$ctx, await this.$data);
  }
}

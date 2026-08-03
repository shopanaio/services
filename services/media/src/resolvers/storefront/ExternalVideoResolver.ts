import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { SubgraphReference } from "@shopana/type-resolver";
import type { File } from "../../repositories/models/index.js";
import {
  loadStorefrontFile,
  resolvePreviewImageId,
} from "./helpers/storefrontFile.js";
import { MediaType } from "./MediaType.js";

@SubgraphReference()
export class ExternalVideoResolver extends MediaType<string, File> {
  $preload() {
    return loadStorefrontFile(this.$ctx, this.$props, ["EXTERNAL_VIDEO"]);
  }

  id() {
    return this.encodeId(this.$props, GlobalIdEntity.File);
  }

  async alt() {
    return this.$get("altText");
  }

  async embedUrl() {
    await this.$data;
    const external = await this.$ctx.loaders.externalMedia.load(this.$props);
    const providerMeta = external?.providerMeta as
      | Record<string, unknown>
      | null
      | undefined;
    const value = providerMeta?.embedUrl;
    return typeof value === "string" ? value : null;
  }

  async host() {
    const provider = await this.$get("provider");
    if (provider === "YOUTUBE" || provider === "VIMEO") return provider;
    throw new Error(`Unsupported external video host: ${provider}`);
  }

  mediaContentType() {
    return "EXTERNAL_VIDEO" as const;
  }

  async originUrl() {
    return this.$get("url");
  }

  async previewImage() {
    const previewId = await resolvePreviewImageId(
      this.$ctx,
      await this.$data,
    );
    return previewId ? this.resolvers.image(previewId) : null;
  }
}

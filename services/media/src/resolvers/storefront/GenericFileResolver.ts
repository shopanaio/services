import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { SubgraphReference } from "@shopana/type-resolver";
import type { File } from "../../repositories/models/index.js";
import {
  loadStorefrontFile,
  resolveDeliveryUrl,
  resolvePreviewImageId,
} from "./helpers/storefrontFile.js";
import { MediaType } from "./MediaType.js";

@SubgraphReference()
export class GenericFileResolver extends MediaType<string, File> {
  $preload() {
    return loadStorefrontFile(this.$ctx, this.$props, ["GENERIC_FILE"]);
  }

  id() {
    return this.encodeId(this.$props, GlobalIdEntity.File);
  }

  async alt() {
    return this.$get("altText");
  }

  async mimeType() {
    return this.$get("mimeType");
  }

  async originalFileSize() {
    return (await this.$get("sizeBytes")).toString();
  }

  async previewImage() {
    const previewId = await resolvePreviewImageId(
      this.$ctx,
      await this.$data,
    );
    return previewId ? this.resolvers.image(previewId) : null;
  }

  async url() {
    return resolveDeliveryUrl(this.$ctx, await this.$data);
  }
}

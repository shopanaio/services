import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { SubgraphReference } from "@shopana/type-resolver";
import type { File } from "../../repositories/models/index.js";
import { loadStorefrontFile, resolvePreviewImageId } from "./helpers/storefrontFile.js";
import { MediaType } from "./MediaType.js";

@SubgraphReference()
export class MediaImageResolver extends MediaType<string, File> {
  $preload() {
    return loadStorefrontFile(this.$ctx, this.$props, ["IMAGE"]);
  }

  id() {
    return this.encodeId(this.$props, GlobalIdEntity.File);
  }

  async alt() {
    return this.$get("altText");
  }

  image() {
    return this.resolvers.image(this.$props);
  }

  mediaContentType() {
    return "IMAGE" as const;
  }

  async previewImage() {
    const previewId = await resolvePreviewImageId(this.$ctx, await this.$data, true);
    return previewId ? this.resolvers.image(previewId) : null;
  }
}

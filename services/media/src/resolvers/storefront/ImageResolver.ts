import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { SubgraphReference } from "@shopana/type-resolver";
import type { ImageTransformOptions } from "../../infrastructure/cdn/index.js";
import type { File } from "../../repositories/models/index.js";
import { loadStorefrontFile, resolveDeliveryUrl } from "./helpers/storefrontFile.js";
import { MediaType } from "./MediaType.js";

@SubgraphReference()
export class ImageResolver extends MediaType<string, File> {
  $preload() {
    return loadStorefrontFile(this.$ctx, this.$props, ["IMAGE"]);
  }

  id() {
    return this.encodeId(this.$props, GlobalIdEntity.File);
  }

  async altText() {
    return this.$get("altText");
  }

  async height() {
    return this.$get("height");
  }

  async thumbhash() {
    return this.$get("thumbhash");
  }

  async url(args: { transform?: ImageTransformOptions | null }) {
    return resolveDeliveryUrl(this.$ctx, await this.$data, args.transform);
  }

  async width() {
    return this.$get("width");
  }
}

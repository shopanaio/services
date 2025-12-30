import { MediaType, Cache } from "./MediaType.js";
import type { ExternalMedia } from "../../repositories/models/index.js";

/**
 * ExternalData resolver - resolves external media data (YouTube, Vimeo, etc.)
 */
export class ExternalDataResolver extends MediaType<string, ExternalMedia | null> {
  @Cache({
    cacheName: "media:external",
    key: (resolver: ExternalDataResolver) => resolver.value,
  })
  async $preload() {
    return this.ctx.loaders.externalMedia.load(this.value);
  }

  async externalId() {
    return this.$get("externalId");
  }

  async providerMeta() {
    return this.$get("providerMeta");
  }
}

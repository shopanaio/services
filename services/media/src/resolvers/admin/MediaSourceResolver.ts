import type { MediaSource } from "../../repositories/models/index.js";
import { TypePolicy } from "@shopana/type-resolver";
import { FileResolver } from "./FileResolver.js";
import { MediaType } from "./MediaType.js";

@TypePolicy<MediaSourceResolver>({
  resource: "store.data",
  action: "read",
  organizationId: (resolver) => resolver.$ctx.store.organizationId,
  domain: (resolver) => `store:${resolver.$ctx.store.id}`,
  onDeny: "null",
})
export class MediaSourceResolver extends MediaType<MediaSource, MediaSource> {
  async $preload() { return this.$props; }

  sourceFile() {
    return new FileResolver(this.$props.sourceFileId, this.$ctx);
  }

  async kind() { return this.$get("kind"); }
  async format() { return this.$get("format"); }
  async sortOrder() { return this.$get("sortOrder"); }
  async createdAt() { return this.$get("createdAt"); }
}

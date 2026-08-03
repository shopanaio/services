import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { PreloadNotFoundError, SubgraphReference } from "@shopana/type-resolver";
import type { ContentExternalReference } from "../../repositories/models/index.js";
import { ReviewsType } from "./ReviewsType.js";

@SubgraphReference()
export class ContentExternalReferenceResolver extends ReviewsType<string, ContentExternalReference> {
  async $preload() {
    const row = await this.$ctx.loaders.contentExternalReference.load(this.$props);
    if (!row || row.deletedAt) throw new PreloadNotFoundError("Content external reference not found");
    const content = await this.$ctx.loaders.content.load(row.contentId);
    if (!content || content.authorCustomerId !== this.$ctx.customer?.id) throw new PreloadNotFoundError("Content external reference not found");
    return row;
  }
  id() { return this.encodeId(this.$props, GlobalIdEntity.ReviewContentExternalReference); }
  async content() { return this.resolvers.content(await this.$get("contentId")); }
  externalSystem() { return this.$get("externalSystem"); } externalType() { return this.$get("externalType"); }
  externalId() { return this.$get("externalId"); } externalUrl() { return this.$get("externalUrl"); }
  direction() { return this.$get("direction"); } syncStatus() { return this.$get("syncStatus"); }
  lastSyncedAt() { return this.$get("lastSyncedAt"); } metadata() { return this.$get("metadata"); }
  createdAt() { return this.$get("createdAt"); } updatedAt() { return this.$get("updatedAt"); }
}

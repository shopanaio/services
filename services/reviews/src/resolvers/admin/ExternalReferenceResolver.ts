import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { PreloadNotFoundError, SubgraphReference } from "@shopana/type-resolver";
import type { ContentExternalReference } from "../../repositories/models/index.js";
import { ReviewsType } from "./ReviewsType.js";

@SubgraphReference()
export class ContentExternalReferenceResolver extends ReviewsType<
  string,
  ContentExternalReference
> {
  async $preload() {
    const reference = await this.$ctx.loaders.contentExternalReference.load(this.$props);
    if (!reference) {
      throw new PreloadNotFoundError(
        `Review content external reference with ID ${this.$props} not found`,
      );
    }
    return reference;
  }

  id() {
    return this.encodeId(this.$props, GlobalIdEntity.ReviewContentExternalReference);
  }
  async content() {
    return this.resolvers.content(await this.$get("contentId"));
  }
  externalSystem() {
    return this.$get("externalSystem");
  }
  externalType() {
    return this.$get("externalType");
  }
  externalId() {
    return this.$get("externalId");
  }
  externalUrl() {
    return this.$get("externalUrl");
  }
  direction() {
    return this.$get("direction");
  }
  syncStatus() {
    return this.$get("syncStatus");
  }
  etag() {
    return this.$get("etag");
  }
  contentChecksum() {
    return this.$get("contentChecksum");
  }
  lastSyncedAt() {
    return this.$get("lastSyncedAt");
  }
  lastError() {
    return this.$get("lastError");
  }
  metadata() {
    return this.$get("metadata");
  }
  createdAt() {
    return this.$get("createdAt");
  }
  updatedAt() {
    return this.$get("updatedAt");
  }
  deletedAt() {
    return this.$get("deletedAt");
  }
}

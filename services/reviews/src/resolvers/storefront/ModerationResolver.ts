import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { PreloadNotFoundError, SubgraphReference } from "@shopana/type-resolver";
import type { ContentRevision, ModerationCase, ModerationEvent, ModerationSignal } from "../../repositories/models/index.js";
import { ReviewsType } from "./ReviewsType.js";

abstract class CustomerOwnedResolver<T extends { contentId: string }> extends ReviewsType<string, T> {
  protected async assertOwned(row: T | null): Promise<T> {
    if (!row) throw new PreloadNotFoundError("Customer-owned review operation not found");
    const content = await this.$ctx.loaders.content.load(row.contentId);
    if (!content || content.authorCustomerId !== this.$ctx.customer?.id) throw new PreloadNotFoundError("Customer-owned review operation not found");
    return row;
  }
}
@SubgraphReference()
export class ModerationCaseResolver extends CustomerOwnedResolver<ModerationCase> {
  async $preload() { return this.assertOwned(await this.$ctx.loaders.moderationCase.load(this.$props)); }
  id() { return this.encodeId(this.$props, GlobalIdEntity.ReviewModerationCase); }
  async content() { return this.resolvers.content(await this.$get("contentId")); }
  status() { return this.$get("status"); } priority() { return this.$get("priority"); }
  reasonCode() { return this.$get("reasonCode"); } dueAt() { return this.$get("dueAt"); }
  resolutionCode() { return this.$get("resolutionCode"); } resolvedAt() { return this.$get("resolvedAt"); }
  createdAt() { return this.$get("createdAt"); } updatedAt() { return this.$get("updatedAt"); }
}
@SubgraphReference()
export class ModerationEventResolver extends CustomerOwnedResolver<ModerationEvent> {
  async $preload() { return this.assertOwned(await this.$ctx.loaders.moderationEvent.load(this.$props)); }
  id() { return this.encodeId(this.$props, GlobalIdEntity.ReviewModerationEvent); }
  async content() { return this.resolvers.content(await this.$get("contentId")); }
  async moderationCase() { const id = await this.$get("caseId"); return id ? this.resolvers.moderationCase(id) : null; }
  action() { return this.$get("action"); } fromStatus() { return this.$get("fromStatus"); }
  toStatus() { return this.$get("toStatus"); } reasonCode() { return this.$get("reasonCode"); }
  isAutomated() { return this.$get("isAutomated"); } createdAt() { return this.$get("createdAt"); }
}
@SubgraphReference()
export class ContentRevisionResolver extends CustomerOwnedResolver<ContentRevision> {
  async $preload() { return this.assertOwned(await this.$ctx.loaders.contentRevision.load(this.$props)); }
  id() { return this.encodeId(this.$props, GlobalIdEntity.ReviewContentRevision); }
  async content() { return this.resolvers.content(await this.$get("contentId")); }
  revision() { return this.$get("revision"); } changeReason() { return this.$get("changeReason"); }
  createdAt() { return this.$get("createdAt"); }
}
@SubgraphReference()
export class ModerationSignalResolver extends CustomerOwnedResolver<ModerationSignal> {
  async $preload() { return this.assertOwned(await this.$ctx.loaders.moderationSignal.load(this.$props)); }
  id() { return this.encodeId(this.$props, GlobalIdEntity.ReviewModerationSignal); }
  async content() { return this.resolvers.content(await this.$get("contentId")); }
  provider() { return this.$get("provider"); } signalType() { return this.$get("signalType"); }
  score() { return this.$get("score"); } verdict() { return this.$get("verdict"); }
  modelVersion() { return this.$get("modelVersion"); } createdAt() { return this.$get("createdAt"); }
}
